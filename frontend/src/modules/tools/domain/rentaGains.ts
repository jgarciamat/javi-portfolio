import { round2 } from './round';

/**
 * Savings income in detail (capital mobiliario, capital gains and losses) and its integration and
 * compensation, box by box of the modelo 100 of 2025 (Orden HAC/277/2026, BOE-A-2026-7041, pages 5,
 * 18 and 19). Rules: LIRPF arts. 25-26 (capital mobiliario), 33-37 (gains and losses, FIFO), 45-49
 * (integration and compensation) of the consolidated text, BOE-A-2006-20764, checked 19-10-2026.
 */

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
const finite = (n: number) => (Number.isFinite(n) ? n : 0);

/** listed: shares and ETFs on a market; unlisted: other shares; fund: investment fund units. */
export type AssetKind = 'listed' | 'unlisted' | 'fund' | 'crypto';

/** A purchase: the date (YYYY-MM-DD), the units and what it cost with its expenses (art. 35.1). */
export interface Lot {
  date: string;
  units: number;
  cost: number;
}

/** A sale: the date, the units and what was obtained less its expenses (art. 35.2). */
export interface Disposal {
  date: string;
  units: number;
  proceeds: number;
}

/** One asset with every purchase (also from earlier years) and the sales of the year. */
export interface AssetOps {
  name: string;
  kind: AssetKind;
  buys: Lot[];
  sells: Disposal[];
}

/** The sale of a property: transmission and acquisition values with their expenses. */
export interface PropertySale {
  name: string;
  /** Sale price less the expenses and taxes paid by the seller (art. 35.2). */
  proceeds: number;
  /** Price, improvements and expenses of the purchase; for an inheritance, the value of the tax (art. 36). */
  cost: number;
  /** Depreciation deducted while it was rented: it lowers the acquisition value (art. 35.1). */
  amortization: number;
  /** homeOver65: main home sold at 65 or more (art. 33.4.b); reinvested: main home reinvested (art. 38.1). */
  exemption: 'none' | 'homeOver65' | 'reinvested';
  /** reinvested: what was put in the new main home. */
  reinvested?: number;
  /** reinvested: the loan on the old home paid off with the sale (RIRPF art. 41.2). */
  pendingLoan?: number;
}

/** Capital mobiliario of the savings base (LIRPF art. 25.1 to 25.3): gross amounts of the year. */
export interface CapitalIncome {
  /** Interest of accounts, deposits and financial assets (box 0027). */
  interest: number;
  /** Dividends and other shares in the profits of companies (box 0029). */
  dividends: number;
  /** Transmission, amortization or repayment of other financial assets, can be negative (box 0031). */
  assets: number;
  /** Life or disability insurance and capitalization operations (box 0032). */
  insurance: number;
  /** Administration and custody of securities, the only deductible expense (art. 26.1.a, box 0037). */
  expenses: number;
}

/** A negative balance of an earlier year still to compensate (a positive amount). */
export interface PendingBalance {
  year: number;
  amount: number;
}

export interface SavingsDetail {
  capital: CapitalIncome;
  assets: AssetOps[];
  properties: PropertySale[];
  /** Other gains (positive) or losses (negative) from transmissions, already worked out. */
  otherGains: number[];
  /** Gains and losses that do not come from a transmission (prizes, grants...): general base (art. 45). */
  generalGains: number[];
  /** Negative balances of the 4 years before: of gains (savings), of capital and of the general gains. */
  pending: { gains: PendingBalance[]; capital: PendingBalance[]; general: PendingBalance[] };
}

export const emptyCapital = (): CapitalIncome => ({
  interest: 0,
  dividends: 0,
  assets: 0,
  insurance: 0,
  expenses: 0,
});

export const emptySavingsDetail = (): SavingsDetail => ({
  capital: emptyCapital(),
  assets: [],
  properties: [],
  otherGains: [],
  generalGains: [],
  pending: { gains: [], capital: [], general: [] },
});

// ─── FIFO ─────────────────────────────────────────────────────────────────────

export interface SaleResult {
  name: string;
  kind: AssetKind;
  date: string;
  units: number;
  proceeds: number;
  /** Acquisition value of the units sold, first in first out (art. 37.2). */
  cost: number;
  /** proceeds − cost. */
  gain: number;
  /** The part of a loss that cannot be counted this year (art. 33.5.f and g). */
  deferred: number;
  /** Units sold that no purchase covers: the data is missing a purchase. */
  unmatched: number;
  /** A loss with homogeneous purchases near the sale that the app does not judge (funds, crypto). */
  checkRepurchase: boolean;
}

// Array sort is stable: purchases on the same day keep the order they were typed in.
const byDate = <T extends { date: string }>(list: T[]) =>
  [...list].sort((a, b) => a.date.localeCompare(b.date));

/** The date `months` after (or before, when negative) an ISO date. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/**
 * The window of art. 33.5: a loss does not count when homogeneous securities were bought "dentro de
 * los dos meses anteriores o posteriores" (listed, letter f) or "en el año anterior o posterior"
 * (unlisted, letter g), while they are still held (also those bought early next year, before the
 * return is filed). It is deferred in the share of the units sold that those still held cover. For fund units and crypto the law does not say
 * clearly which letter applies (NO CONFIRMADO): the app only warns.
 */
const WINDOW_MONTHS: Partial<Record<AssetKind, number>> = { listed: 2, unlisted: 12 };
const WARN_MONTHS = 2;

interface OpenLot extends Lot {
  left: number;
}

/** The sales of one asset matched with its purchases, the oldest first (LIRPF art. 37.2). */
export function fifo(asset: AssetOps): SaleResult[] {
  const lots: OpenLot[] = byDate(asset.buys).map((b) => ({
    ...b,
    units: positive(b.units),
    cost: positive(b.cost),
    left: positive(b.units),
  }));
  const sells = byDate(asset.sells);
  const raw = sells.map((s) => {
    let units = positive(s.units);
    let cost = 0;
    for (const lot of lots) {
      if (units <= 0) break;
      if (lot.date > s.date || lot.left <= 0) continue;
      const used = Math.min(lot.left, units);
      cost += (lot.cost * used) / lot.units;
      lot.left -= used;
      units -= used;
    }
    return { sale: s, cost: round2(cost), unmatched: units };
  });
  return raw.map(({ sale, cost, unmatched }) => {
    const proceeds = round2(positive(sale.proceeds));
    const gain = round2(proceeds - cost);
    const months = WINDOW_MONTHS[asset.kind];
    const near = (span: number) =>
      lots.filter(
        (l) => l.date >= addMonths(sale.date, -span) && l.date <= addMonths(sale.date, span)
      );
    let deferred = 0;
    if (gain < 0 && months !== undefined) {
      const stillHeld = near(months).reduce((sum, l) => sum + l.left, 0);
      const share = Math.min(1, stillHeld / positive(sale.units));
      deferred = round2(-gain * share);
    }
    const checkRepurchase =
      gain < 0 && months === undefined && near(WARN_MONTHS).some((l) => l.left > 0);
    return {
      name: asset.name,
      kind: asset.kind,
      date: sale.date,
      units: positive(sale.units),
      proceeds,
      cost,
      gain,
      deferred,
      unmatched,
      checkRepurchase,
    };
  });
}

// ─── Properties ───────────────────────────────────────────────────────────────

export interface PropertyResult {
  name: string;
  gain: number;
  /** The exempt part of the gain (art. 33.4.b or 38.1). */
  exempt: number;
  /** What goes to the savings base. */
  taxable: number;
}

/** The gain of a property sold, with the exemption of the main home when it applies. */
export function propertyGain(p: PropertySale): PropertyResult {
  const cost = Math.max(0, positive(p.cost) - positive(p.amortization));
  const gain = round2(positive(p.proceeds) - cost);
  let exempt = 0;
  if (gain > 0 && p.exemption === 'homeOver65') exempt = gain;
  if (gain > 0 && p.exemption === 'reinvested') {
    // Art. 38.1 and RIRPF art. 41.2: the share of the "importe total obtenido" (less the loan paid off)
    // that was reinvested.
    const obtained = positive(p.proceeds) - positive(p.pendingLoan ?? 0);
    const share = obtained > 0 ? Math.min(1, positive(p.reinvested ?? 0) / obtained) : 1;
    exempt = round2(gain * share);
  }
  return { name: p.name, gain, exempt, taxable: round2(gain - exempt) };
}

// ─── Integration and compensation ─────────────────────────────────────────────

/** Uses the pending balances, the oldest first, up to `room`; what is used and what is left of each. */
function takePending(list: PendingBalance[], room: number) {
  let left = Math.max(0, room);
  const after: PendingBalance[] = [];
  let used = 0;
  for (const p of [...list].sort((a, b) => a.year - b.year)) {
    const take = Math.min(positive(p.amount), left);
    left -= take;
    used += take;
    after.push({ year: p.year, amount: round2(positive(p.amount) - take) });
  }
  return { used: round2(used), after };
}

/** The pending balances that can still be used: of the four years before the return. */
const inTime = (list: PendingBalance[], year: number) =>
  list.filter((p) => p.year >= year - 4 && p.year < year && positive(p.amount) > 0);

/** Next year only the last three years and this one can still be used. */
const carried = (list: PendingBalance[], year: number, own: number): PendingBalance[] => [
  ...list.filter((p) => p.year > year - 4 && p.amount > 0),
  ...(own > 0 ? [{ year, amount: round2(own) }] : []),
];

export interface SavingsBreakdown {
  sales: SaleResult[];
  properties: PropertyResult[];
  /** Boxes of the modelo 100 of 2025. */
  boxes: {
    '0027': number;
    '0029': number;
    '0031': number;
    '0032': number;
    '0036': number;
    '0037': number;
    '0041': number;
    '0418': number;
    '0419': number;
    '0420': number;
    '0421': number;
    '0422': number;
    '0423': number;
    '0424': number;
    '0425': number;
    '0429': number;
    '0430': number;
    /** Current negative capital off the gains, up to 25 % of 0424. */
    '0436': number;
    /** Earlier negative gains off this year's gains (0439 to 0442 together). */
    pendingGainsOnGains: number;
    /** Earlier negative capital off the gains, within the 25 % (0443 to 0447 together). */
    pendingCapitalOnGains: number;
    /** Current negative gains off the capital, up to 25 % of 0429. */
    '0446': number;
    /** Earlier negative capital off this year's capital (0449 to 0452 together). */
    pendingCapitalOnCapital: number;
    /** Earlier negative gains off the capital, within the 25 % (0453 to 0448 together). */
    pendingGainsOnCapital: number;
    /** Savings taxable base. */
    '0460': number;
  };
  /** Gains and losses of the general base, before the compensation with the other income. */
  general: { positive: number; negative: number; pending: PendingBalance[] };
  /** What is left for the next four years (art. 49.1, last paragraphs). */
  carryForward: { gains: PendingBalance[]; capital: PendingBalance[] };
}

/** Capital mobiliario of the savings base: gross amounts less the deductible expenses (box 0041). */
function capitalOf(c: CapitalIncome) {
  const gross = round2(
    positive(c.interest) + positive(c.dividends) + finite(c.assets) + positive(c.insurance)
  );
  const expenses = round2(positive(c.expenses));
  return { gross, expenses, net: round2(gross - expenses) };
}

/** Sum of gains and of losses (boxes 0422-0423 for the savings, 0418-0419 for the general base). */
function split(amounts: number[]) {
  const gains = round2(amounts.filter((a) => a > 0).reduce((s, a) => s + a, 0));
  const losses = round2(-amounts.filter((a) => a < 0).reduce((s, a) => s + a, 0));
  return { gains, losses, balance: round2(gains - losses) };
}

/**
 * The savings base (LIRPF art. 49; modelo 100 of 2025, page 19, in the order of its boxes): each
 * balance with itself, a negative one against the other up to 25 % of it, then the balances of the
 * four years before, the oldest first.
 */
export function savingsOf(detail: SavingsDetail, year: number): SavingsBreakdown {
  const inYear = (date: string) => date.startsWith(`${year}-`);
  const sales = detail.assets.flatMap((a) => fifo(a)).filter((s) => inYear(s.date));
  const properties = detail.properties.map(propertyGain);
  const capital = capitalOf(detail.capital);
  const gainsList = [
    ...sales.map((s) => round2(s.gain + s.deferred)),
    ...properties.map((p) => p.taxable),
    ...detail.otherGains.map(finite),
  ];
  const savingsGains = split(gainsList);
  const general = split(detail.generalGains.map(finite));

  const g424 = Math.max(0, savingsGains.balance);
  const g425 = Math.max(0, -savingsGains.balance);
  const c429 = Math.max(0, capital.net);
  const c430 = Math.max(0, -capital.net);
  const pendingGains = inTime(detail.pending.gains, year);
  const pendingCapital = inTime(detail.pending.capital, year);

  // This year's negative balance of each part against the other, up to 25 % of it (0436, 0446).
  const quarterGains = g424 * 0.25;
  const quarterCapital = c429 * 0.25;
  const b436 = round2(Math.min(c430, quarterGains));
  const b446 = round2(Math.min(g425, quarterCapital));
  // Earlier balances, each first against its own part in full (0439-0442, 0449-0452), and what is
  // left ("resto ... saldo pendiente no compensado") against the other within the same 25 %.
  const onGains = takePending(pendingGains, g424 - b436);
  const onCapital = takePending(pendingCapital, c429 - b446);
  const capitalOnGains = takePending(
    onCapital.after,
    Math.min(quarterGains - b436, g424 - b436 - onGains.used)
  );
  const gainsOnCapital = takePending(
    onGains.after,
    Math.min(quarterCapital - b446, c429 - b446 - onCapital.used)
  );
  const base = round2(
    g424 -
      b436 -
      onGains.used -
      capitalOnGains.used +
      c429 -
      b446 -
      onCapital.used -
      gainsOnCapital.used
  );
  return {
    sales,
    properties,
    boxes: {
      '0027': round2(positive(detail.capital.interest)),
      '0029': round2(positive(detail.capital.dividends)),
      '0031': round2(finite(detail.capital.assets)),
      '0032': round2(positive(detail.capital.insurance)),
      '0036': capital.gross,
      '0037': capital.expenses,
      '0041': capital.net,
      '0418': general.gains,
      '0419': general.losses,
      '0420': Math.max(0, general.balance),
      '0421': Math.max(0, -general.balance),
      '0422': savingsGains.gains,
      '0423': savingsGains.losses,
      '0424': g424,
      '0425': g425,
      '0429': c429,
      '0430': c430,
      '0436': b436,
      pendingGainsOnGains: onGains.used,
      pendingCapitalOnGains: capitalOnGains.used,
      '0446': b446,
      pendingCapitalOnCapital: onCapital.used,
      pendingGainsOnCapital: gainsOnCapital.used,
      '0460': Math.max(0, base),
    },
    general: {
      positive: Math.max(0, general.balance),
      negative: Math.max(0, -general.balance),
      pending: inTime(detail.pending.general, year),
    },
    carryForward: {
      gains: carried(gainsOnCapital.after, year, g425 - b446),
      capital: carried(capitalOnGains.after, year, c430 - b436),
    },
  };
}

/**
 * The general base with the gains that do not come from a transmission (LIRPF art. 48; modelo 100
 * of 2025, page 19: [0435] = [0420] − [0431] + [0432] − [0433] − [0434]). `income` is box 0432: the
 * work, capital and property income and the imputations. A negative balance of gains goes against it
 * up to 25 %, and so do the earlier ones, within the same 25 %.
 */
export function generalBaseOf(
  income: number,
  general: SavingsBreakdown['general'],
  year: number
): { base: number; '0431': number; '0433': number; '0434': number; carry: PendingBalance[] } {
  const b431 = takePending(general.pending, general.positive);
  const quarter = Math.max(0, income) * 0.25;
  const b433 = round2(Math.min(general.negative, quarter));
  const b434 = takePending(b431.after, quarter - b433);
  return {
    base: round2(general.positive - b431.used + income - b433 - b434.used),
    '0431': b431.used,
    '0433': b433,
    '0434': b434.used,
    carry: carried(b434.after, year, general.negative - b433),
  };
}
