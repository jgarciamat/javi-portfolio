import type { CertificateLine } from './invest/pdfReports';
import type { InvestOp } from './invest/types';
import { round2 } from './round';
import { rentaAbatement } from '../data/renta/abatimiento';
import { abate, type AbatementItem, type AbatementKind } from './rentaAbatement';

/**
 * Savings income in detail (capital mobiliario, capital gains and losses) and its integration and
 * compensation, box by box of the modelo 100 of 2025 (Orden HAC/277/2026, BOE-A-2026-7041, pages 5,
 * 18 and 19). Rules: LIRPF arts. 25-26 (capital mobiliario), 33-37 (gains and losses, FIFO), 45-49
 * (integration and compensation) of the consolidated text, BOE-A-2006-20764, checked 19-10-2026.
 */

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
const finite = (n: number) => (Number.isFinite(n) ? n : 0);

/**
 * listed: shares and ETFs on a market; unlisted: other shares; fund: investment fund units; crypto:
 * virtual currencies; other: any other asset sold (gold of an app, a derivative...), no window.
 */
export type AssetKind = 'listed' | 'unlisted' | 'fund' | 'crypto' | 'other';

/**
 * Box 1803, what was received for the coins (Renta2025.xsd, tipo_ClaveCri): F legal tender, N
 * another virtual currency, O another virtual asset (an NFT), B goods or services.
 */
export type Counterpart = 'F' | 'N' | 'O' | 'B';

/**
 * Where the modelo 100 of 2025 asks for each sale (Orden HAC/277/2026, BOE-A-2026-7041, page 15):
 * iic, units of funds (boxes 0310-0325); etf, listed funds and index SICAV, a part of its own since
 * 2025 (2225-2236); shares, listed shares (0326-0340); crypto, virtual currencies (1800-1814);
 * other, the rest of the transmissions (other elements, 1624-1654).
 */
export type GainSection = 'iic' | 'etf' | 'shares' | 'crypto' | 'other';

const SECTION_OF: Record<AssetKind, GainSection> = {
  listed: 'shares',
  unlisted: 'other',
  fund: 'iic',
  crypto: 'crypto',
  other: 'other',
};

/** A purchase: the date (YYYY-MM-DD), the units and what it cost with its expenses (art. 35.1). */
export interface Lot {
  date: string;
  units: number;
  cost: number;
  /**
   * Bought before 31-12-1994, listed shares or fund units: the value of the whole lot for the
   * Wealth Tax of 2005 (LIRPF DT 9.ª, rule 2.ª), for the abatement coefficients.
   */
  ip2005?: number;
}

/** A sale: the date, the units and what was obtained less its expenses (art. 35.2). */
export interface Disposal {
  date: string;
  units: number;
  proceeds: number;
  /**
   * Units that leave without a sale: a transfer between funds (art. 94.1.a, the new units keep the
   * cost and dates) or a network fee paid in coins. They use up lots but give no gain or loss.
   */
  untaxed?: boolean;
  /**
   * Crypto, box 1803: what was received (keys of tipo_ClaveCri of Renta2025.xsd).
   */
  counterpart?: Counterpart;
}

/** One asset with every purchase (also from earlier years) and the sales of the year. */
export interface AssetOps {
  name: string;
  kind: AssetKind;
  buys: Lot[];
  sells: Disposal[];
  /** The part of the modelo where its sales go, when it is not the usual one of its kind (an ETF). */
  section?: GainSection;
  /** The ISIN or ticker, for the report. */
  code?: string;
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
  /**
   * Dates (YYYY-MM-DD) of the purchase and of the sale: bought before 31-12-1994, the abatement
   * coefficients of the DT 9.ª. An improvement made later goes as a sale of its own (rule 3.ª).
   */
  acquired?: string;
  sold?: string;
}

/** Capital mobiliario of the savings base (LIRPF art. 25.1 to 25.3): gross amounts of the year. */
export interface CapitalIncome {
  /** Interest of accounts, deposits and financial assets (box 0027). */
  interest: number;
  /** Dividends and other shares in the profits of companies (box 0029). */
  dividends: number;
  /** Transmission or amortization of Letras del Tesoro, can be negative (box 0030). */
  bills: number;
  /**
   * Transmission, amortization or repayment of other financial assets (bonds, debentures...), can be
   * negative (box 0031).
   */
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
  /**
   * Transmission values of the sales of the years before since 2015 that had the abatement
   * coefficients (DT 9.ª.1.1.ª b): they use up the 400,000 €.
   */
  abatementPrior?: number;
  /** What came from the files of brokers and exchanges (investImport): replaced on each import. */
  imported?: ImportedSavings;
}

/** What one imported file gave: its operations in euros and the certificate lines ticked. */
export interface ImportSource {
  /** The file's name; '' for the operations typed by hand. */
  file: string;
  ops: InvestOp[];
  certificate: CertificateLine[];
}

/** Tax paid abroad on income taxed here too (LIRPF art. 80): for the deduction of box 0588. */
export interface ForeignTax {
  /** Gross income obtained abroad, in euros. */
  income: number;
  /** Tax paid there, in euros. */
  tax: number;
}

/** The savings read from investment files, kept apart so a new import replaces them. */
export interface ImportedSavings {
  files: string[];
  /**
   * The operations of each file already in euros, and the options of the import: with them one
   * file can be taken out later and the rest worked out again (invest/sources.ts).
   */
  sources?: ImportSource[];
  options?: { year: number; professional: boolean };
  capital: CapitalIncome;
  assets: AssetOps[];
  /** Gains and losses that do not come from a transmission (airdrops, rewards): general base. */
  generalGains: number[];
  /** Other results of transmissions already worked out (derivatives, a certificate). */
  otherGains: number[];
  /** Spanish withholdings on capital income (box 0597) and on fund gains (box 0603). */
  withheld: { capital: number; gains: number };
  foreignTax: ForeignTax[];
}

export const emptyCapital = (): CapitalIncome => ({
  interest: 0,
  dividends: 0,
  bills: 0,
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
  /** The parts of lots bought before 31-12-1994 that can have the abatement (DT 9.ª). */
  pre1995?: AbatementItem[];
  /** A listed share or fund unit of before 1995 without its 2005 value: no reduction until given. */
  needsIp2005?: boolean;
  /** The abatement of the DT 9.ª on this sale (set by `savingsOf`, with the 400,000 €). */
  reduction?: number;
  /** A loss with homogeneous purchases near the sale that the app does not judge (crypto). */
  checkRepurchase: boolean;
  section: GainSection;
  /** The purchases each sale used, oldest first: the audit of the FIFO. */
  lots: Lot[];
  counterpart?: Counterpart;
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
 * return is filed). It is deferred in the share of the units sold that those still held cover. Units
 * of funds are "participaciones no admitidas a negociación" (letter g, one year) and ETFs are listed
 * (letter f); for crypto the law gives no rule (NO CONFIRMADO): the app only warns.
 */
const WINDOW_MONTHS: Partial<Record<AssetKind, number>> = { listed: 2, unlisted: 12, fund: 12 };
const WARN_MONTHS = 2;

interface OpenLot extends Lot {
  left: number;
}

/** The coefficient of each kind (DT 9.ª.1.1.ª c): ETFs and funds are fund units, not shares. */
function abatementKindOf(kind: AssetKind, section: GainSection): AbatementKind | null {
  if (kind === 'crypto') return null;
  return kind === 'listed' && section === 'shares' ? 'listed' : 'other';
}

/** Rule 2.ª (the 2005 value) is for securities admitted to trading and fund units. */
const ruleTwo = (kind: AssetKind) => kind === 'listed' || kind === 'fund';

/** The parts of a sale from lots bought before 1995, each with its share of the proceeds. */
function pre1995Of(
  asset: AssetOps,
  section: GainSection,
  sale: Disposal,
  used: Lot[]
): { items: AbatementItem[]; needsIp2005: boolean } {
  const kind = abatementKindOf(asset.kind, section);
  const units = positive(sale.units);
  const old = used.filter((part) => part.date <= rentaAbatement.acquiredUntil);
  if (!kind || old.length === 0) return { items: [], needsIp2005: false };
  const needsIp2005 = ruleTwo(asset.kind) && old.some((part) => part.ip2005 === undefined);
  const items = old
    .filter((part) => !ruleTwo(asset.kind) || part.ip2005 !== undefined)
    .map((part): AbatementItem => {
      const proceeds = round2((positive(sale.proceeds) * part.units) / units);
      return {
        kind,
        acquired: part.date,
        sold: sale.date,
        proceeds,
        gain: round2(proceeds - part.cost),
        cost: part.cost,
        ...(part.ip2005 !== undefined ? { ip2005: part.ip2005 } : {}),
      };
    });
  return { items, needsIp2005 };
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
    const used: Lot[] = [];
    for (const lot of lots) {
      if (units <= 0) break;
      if (lot.date > s.date || lot.left <= 0) continue;
      const take = Math.min(lot.left, units);
      const share = (lot.cost * take) / lot.units;
      cost += share;
      used.push({
        date: lot.date,
        units: take,
        cost: round2(share),
        ...(lot.ip2005 !== undefined ? { ip2005: round2((lot.ip2005 * take) / lot.units) } : {}),
      });
      lot.left -= take;
      units -= take;
    }
    return { sale: s, cost: round2(cost), unmatched: units, used };
  });
  const section = asset.section ?? SECTION_OF[asset.kind];
  return raw.flatMap(({ sale, cost, unmatched, used }) => {
    if (sale.untaxed) return [];
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
      gain < 0 && asset.kind === 'crypto' && near(WARN_MONTHS).some((l) => l.left > 0);
    const old = pre1995Of(asset, section, sale, used);
    return [
      {
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
        section,
        lots: used,
        counterpart: sale.counterpart,
        ...(old.items.length > 0 ? { pre1995: old.items } : {}),
        ...(old.needsIp2005 ? { needsIp2005: true } : {}),
      },
    ];
  });
}

// ─── Properties ───────────────────────────────────────────────────────────────

export interface PropertyResult {
  name: string;
  gain: number;
  /** The exempt part of the gain (art. 33.4.b or 38.1). */
  exempt: number;
  /** The abatement of the DT 9.ª on the part not exempt, and the gain generated up to 19-01-2006. */
  reduction: number;
  before: number;
  /** What goes to the savings base. */
  taxable: number;
}

/** The gain of a property sold and its exempt part, before the abatement. */
function propertyBase(p: PropertySale): { gain: number; exempt: number; item: AbatementItem } {
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
  // The exempt part neither has the reduction nor counts towards the 400,000 € (Manual 2025, c11,
  // «Cálculo del valor de transmisión», checked 22-10-2026: the reinvested value is left out).
  const free = gain > 0 ? (gain - exempt) / gain : 1;
  const item: AbatementItem = {
    kind: 'property',
    acquired: p.acquired ?? '',
    sold: p.sold ?? '',
    proceeds: round2(positive(p.proceeds) * free),
    gain: round2(gain - exempt),
  };
  return { gain, exempt, item };
}

/** A property sold with its abatement worked out (`abatement` from {@link abate}). */
const propertyOf = (
  p: PropertySale,
  base: ReturnType<typeof propertyBase>,
  abatement: { before: number; reduction: number }
): PropertyResult => ({
  name: p.name,
  gain: base.gain,
  exempt: base.exempt,
  reduction: abatement.reduction,
  before: abatement.before,
  taxable: round2(base.gain - base.exempt - abatement.reduction),
});

/**
 * The gain of a property sold, with the exemption of the main home when it applies and the
 * abatement of the DT 9.ª after `prior` € of transmission values that used up the 400,000 €.
 */
export function propertyGain(p: PropertySale, prior = 0): PropertyResult {
  const base = propertyBase(p);
  return propertyOf(p, base, abate([base.item], prior)[0]);
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

/** The totals of one part of the modelo: what is copied in its boxes, summed over its sales. */
export interface SectionTotals {
  /** Transmission values (0312, 0328, 1804). */
  proceeds: number;
  /** Acquisition values (0315, 0331, 1806). */
  cost: number;
  /** Gains (0324, 0339, 1814) and losses that count this year (0325, 0340, 1813). */
  gains: number;
  losses: number;
}

export interface SavingsBreakdown {
  sales: SaleResult[];
  /** The sales summed by the part of the modelo where they go. */
  sections: Record<GainSection, SectionTotals>;
  /** Withholdings of the savings: capital (box 0597) and fund gains (box 0603). */
  withheld: { capital: number; gains: number };
  /** Tax paid abroad, for the deduction of box 0588. */
  foreignTax: ForeignTax[];
  properties: PropertyResult[];
  /** Boxes of the modelo 100 of 2025. */
  boxes: {
    '0027': number;
    '0029': number;
    '0030': number;
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
    positive(c.interest) +
      positive(c.dividends) +
      finite(c.bills) +
      finite(c.assets) +
      positive(c.insurance)
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

const SECTIONS: GainSection[] = ['iic', 'etf', 'shares', 'crypto', 'other'];

/** The sales of the year summed by part of the modelo; a deferred loss does not count (art. 33.5). */
function sectionsOf(sales: SaleResult[]): Record<GainSection, SectionTotals> {
  const out = {} as Record<GainSection, SectionTotals>;
  for (const section of SECTIONS) {
    const list = sales.filter((s) => s.section === section);
    const total = (pick: (s: SaleResult) => number) =>
      round2(list.reduce((sum, s) => sum + pick(s), 0));
    out[section] = {
      proceeds: total((s) => s.proceeds),
      cost: total((s) => s.cost),
      gains: total((s) => Math.max(0, s.gain)),
      losses: total((s) => Math.max(0, -(s.gain + s.deferred))),
    };
  }
  return out;
}

/** The typed detail with what came from the files added to it. */
function withImported(detail: SavingsDetail): SavingsDetail {
  const extra = detail.imported;
  if (!extra) return detail;
  // Over an empty one: a detail saved before a box was added (box 0030) has no field for it.
  const capital = { ...emptyCapital(), ...detail.capital };
  for (const key of Object.keys(capital) as (keyof CapitalIncome)[])
    capital[key] = round2(finite(capital[key]) + finite(extra.capital[key]));
  return {
    ...detail,
    capital,
    assets: [...detail.assets, ...extra.assets],
    otherGains: [...detail.otherGains, ...extra.otherGains],
    generalGains: [...detail.generalGains, ...extra.generalGains],
  };
}

/**
 * The abatement of the DT 9.ª on the sales and properties of the year, in the order they were sold:
 * one 400,000 € for all of them, after what the years before used up.
 */
function abated(sales: SaleResult[], list: PropertySale[], prior: number) {
  const bases = list.map(propertyBase);
  const items = [...bases.map((b) => b.item), ...sales.flatMap((s) => s.pre1995 ?? [])];
  const results = abate(items, prior);
  const properties = list.map((p, i) => propertyOf(p, bases[i], results[i]));
  let next = list.length;
  const withReduction = sales.map((s) => {
    if (!s.pre1995) return s;
    const mine = results.slice(next, next + s.pre1995.length);
    next += s.pre1995.length;
    return { ...s, reduction: round2(mine.reduce((sum, r) => sum + r.reduction, 0)) };
  });
  return { sales: withReduction, properties };
}

/**
 * The savings base (LIRPF art. 49; modelo 100 of 2025, page 19, in the order of its boxes): each
 * balance with itself, a negative one against the other up to 25 % of it, then the balances of the
 * four years before, the oldest first.
 */
export function savingsOf(typed: SavingsDetail, year: number): SavingsBreakdown {
  const detail = withImported(typed);
  const inYear = (date: string) => date.startsWith(`${year}-`);
  const { sales, properties } = abated(
    detail.assets.flatMap((a) => fifo(a)).filter((s) => inYear(s.date)),
    detail.properties,
    detail.abatementPrior ?? 0
  );
  const capital = capitalOf(detail.capital);
  const gainsList = [
    ...sales.map((s) => round2(s.gain + s.deferred - (s.reduction ?? 0))),
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
  const imported = typed.imported;
  return {
    sales,
    sections: sectionsOf(sales),
    withheld: {
      capital: round2(positive(imported?.withheld.capital ?? 0)),
      gains: round2(positive(imported?.withheld.gains ?? 0)),
    },
    foreignTax: imported?.foreignTax ?? [],
    properties,
    boxes: {
      '0027': round2(positive(detail.capital.interest)),
      '0029': round2(positive(detail.capital.dividends)),
      '0030': round2(finite(detail.capital.bills)),
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
