import { round2 } from '../round';
import {
  emptyCapital,
  fifo,
  type AssetKind,
  type AssetOps,
  type Counterpart,
  type ForeignTax,
  type GainSection,
  type ImportedSavings,
  type Lot,
  type SaleResult,
} from '../rentaGains';
import { EUR_STABLE, toEur, USD_STABLE, type RateTable } from './fx';
import { FIAT } from './read';
import type { AssetClass, InvestOp, InvestWarning } from './types';

/**
 * From the operations of every file to the figures of the Renta (LIRPF consolidated text,
 * BOE-A-2006-20764, checked 19-10-2026; AEAT, Manual práctico de Renta 2025 and help of the
 * modelo 100 on virtual currencies, sede.agenciatributaria.gob.es, checked 19-10-2026):
 *
 * - Every sale, and every swap of one crypto for another, is a transmission (arts. 33.1 and
 *   37.1.h): the transmission value of a swap is the higher of the market values of what is given and
 *   what is received, and that value is the acquisition value of what is received.
 * - The units sold are the oldest ones (art. 37.2 for securities; for crypto the AEAT applies it
 *   "aunque se hayan realizado en distintas casas de cambio"): the lots are one queue per asset for
 *   all the platforms, not one per account.
 * - Fees of a purchase raise its acquisition value, those of a sale lower its transmission value
 *   (art. 35.1.b and 35.2).
 * - Transfers between own wallets and accounts are not transmissions; a transfer between funds keeps
 *   the cost and dates of the units transferred (art. 94.1.a) and does not apply to ETFs.
 * - Staking and lending: capital mobiliario (art. 25.2; DGT V1766-22, V0648-24, V0612-26), savings
 *   base (art. 46.a), at the market value of the day received, which is also the cost of the coins.
 * - Airdrops, cashback, referral and learn rewards: gains that do not come from a transmission
 *   (art. 33.1), general base (art. 45) — NO CONFIRMADO: the DGT has not fixed one criterion for
 *   each; the app says so next to each one.
 * - Mining (and trading as an organised business): an economic activity, left out of the savings.
 * - Derivatives (CFDs, leveraged positions): gains of the savings base (art. 46.b) — NO CONFIRMADO.
 * - Treasury bills and bonds: capital mobiliario (art. 25.2.b), box 0031 (0030 for bills).
 * - Dividends and interest: boxes 0029 and 0027; withholding in Spain, box 0597; tax paid abroad,
 *   deduction of art. 80 (box 0588); custody fees, the only expense, box 0037 (art. 26.1.a).
 */

export interface LedgerOptions {
  year: number;
  rates: RateTable;
  /** The person trades as a business: rewards and results go to the activity, not the savings. */
  professional?: boolean;
  /** Platforms where the withholding is Spanish (default: the format's). */
  withheldIn?: Record<string, 'origin' | 'spain'>;
}

/** An operation with its euros worked out, as shown in the table. */
export interface ValuedOp extends InvestOp {
  /** Euros of the operation (what was paid, obtained or received). */
  value: number | null;
  /** Euros of the fee (or of the fee in coins, at their cost: not known). */
  feeEur: number;
}

/** Income of the year: where it goes in the modelo. */
export interface IncomeLine {
  date: string;
  account: string;
  asset: string;
  what: 'dividend' | 'interest' | 'staking' | 'lending' | 'other' | 'custody' | 'activity';
  eur: number;
  withheld: number;
  withheldIn: 'origin' | 'spain';
  /** The box of the modelo 100 of 2025 (NO CONFIRMADO for the rewards). */
  box: string;
  base: 'savings' | 'general' | 'activity';
}

/** A result already worked out: a derivative or a position the platform closed. */
export interface DirectGain {
  date: string;
  /** When the position was opened (the closing day when the file does not say). */
  acquired: string;
  account: string;
  asset: string;
  underlying?: AssetClass;
  proceeds: number;
  cost: number;
  gain: number;
}

/** What is held at the end of the year, on each platform. */
export interface Holding {
  account: string;
  asset: string;
  assetClass: AssetClass;
  units: number;
  /** Last value known in the files (euros per unit × units): an estimate, not the 31-12 price. */
  value: number | null;
}

export interface LedgerResult {
  /** The year of the Renta it was worked out for. */
  year: number;
  ops: ValuedOp[];
  /** What goes to the Renta (rentaGains.ImportedSavings). */
  imported: ImportedSavings;
  /** Sales of the year with their FIFO audit, by asset (all years in `history`). */
  sales: (SaleResult & { code: string })[];
  history: (SaleResult & { code: string })[];
  direct: DirectGain[];
  income: IncomeLine[];
  holdings: Holding[];
  /** Results of each year found in the files (to see what should have been declared each year). */
  years: Record<number, { savings: number; general: number }>;
  warnings: InvestWarning[];
}

const KIND: Record<AssetClass, AssetKind> = {
  crypto: 'crypto',
  shares: 'listed',
  etf: 'listed',
  fund: 'fund',
  bond: 'other',
  derivative: 'other',
  commodity: 'other',
  fiat: 'other',
};

/** Platforms that keep the assets in Spain, or where the person keeps them (models 720/721). */
export const SPANISH =
  /bit2me|fondos y valores|myinvestor|indexa|finizens|renta 4|openbank|bbva|santander|caixabank|ing\b|inversis/i;
const SELF = /ledger live|etherscan/i;

/** The key that makes units homogeneous: the ISIN of a security, the ticker of a coin. */
const keyOf = (op: { asset: string; isin?: string; assetClass: AssetClass }, asset: string) =>
  `${op.assetClass === 'crypto' ? 'crypto' : op.assetClass}|${
    op.assetClass === 'crypto' ? asset : op.isin ?? asset
  }`;

interface Queue {
  lots: { date: string; units: number; cost: number }[];
}

/** Takes units from the oldest lots: what was taken (with its cost) and what was missing. */
function take(queue: Queue, units: number): { taken: Lot[]; missing: number } {
  let left = units;
  const taken: Lot[] = [];
  for (const lot of queue.lots) {
    if (left <= 1e-12) break;
    const used = Math.min(lot.units, left);
    const cost = (lot.cost * used) / lot.units;
    taken.push({ date: lot.date, units: used, cost });
    lot.units -= used;
    lot.cost -= cost;
    left -= used;
  }
  queue.lots = queue.lots.filter((l) => l.units > 1e-12);
  return { taken, missing: left > 1e-9 ? left : 0 };
}

const once = (list: InvestWarning[], w: InvestWarning) => {
  if (!list.some((x) => x.code === w.code && x.asset === w.asset)) list.push(w);
};

/** Values every operation in euros: the file's own euros first, then the rate of its day. */
function valueOf(op: InvestOp, rates: RateTable, warnings: InvestWarning[]): ValuedOp {
  const money = (amount: number | null, currency: string | null) => {
    if (amount === null) return null;
    const { eur, how } = toEur(amount, currency, op.date, rates, FIAT);
    // The rate a stablecoin needs is the dollar's.
    const rateOf = USD_STABLE.has(String(currency)) ? 'USD' : String(currency);
    if (how === 'missingRate') once(warnings, { code: 'missingRate', asset: rateOf });
    if (how === 'stable') once(warnings, { code: 'stablecoinPrice', asset: String(currency) });
    return eur;
  };
  // A swap from or to a stablecoin is valued by the stablecoin (NO CONFIRMADO as exact).
  const stable = (asset?: string) => !!asset && (USD_STABLE.has(asset) || EUR_STABLE.has(asset));
  const given = op.kind === 'swap' && stable(op.asset) ? money(op.units, op.asset) : null;
  const got =
    op.kind === 'swap' && stable(op.toAsset) ? money(op.toUnits ?? 0, String(op.toAsset)) : null;
  const value = op.eur ?? money(op.amount, op.currency) ?? given;
  const feeCurrency = op.feeCurrency ?? op.currency;
  const feeIsMoney =
    feeCurrency !== null &&
    (FIAT.has(feeCurrency) || USD_STABLE.has(feeCurrency) || EUR_STABLE.has(feeCurrency));
  const feeEur = op.fee > 0 && feeIsMoney ? money(op.fee, feeCurrency) ?? 0 : 0;
  return {
    ...op,
    toEur: op.toEur ?? got,
    value: value === null ? null : round2(value),
    feeEur: round2(feeEur),
  };
}

/** The fee paid in units of the asset itself or of a third coin (not in money). */
const coinFee = (op: ValuedOp) => {
  const currency = op.feeCurrency ?? op.currency;
  return op.fee > 0 && op.feeEur === 0 && currency !== null && !FIAT.has(currency)
    ? currency
    : null;
};

/** Box 1803: given by the file, another virtual asset for an NFT, another coin, or money. */
const counterpartOf = (op: ValuedOp): Counterpart =>
  op.counterpart ??
  (op.kind === 'swap' ? (op.toClass && op.toClass !== 'crypto' ? 'O' : 'N') : 'F');

/** Book of each asset: its lots for the Renta (AssetOps) and the running queue. */
class Book {
  readonly assets = new Map<string, AssetOps & { cls: AssetClass }>();
  readonly queues = new Map<string, Queue>();
  readonly balances = new Map<string, Holding>();

  asset(
    op: { asset: string; isin?: string; name?: string; assetClass: AssetClass },
    asset = op.asset
  ) {
    const key = keyOf(op, asset);
    let entry = this.assets.get(key);
    if (!entry) {
      entry = {
        name: op.assetClass === 'crypto' ? asset : op.name ?? asset,
        code: op.assetClass === 'crypto' ? asset : op.isin ?? asset,
        kind: KIND[op.assetClass],
        section: op.assetClass === 'etf' ? 'etf' : undefined,
        buys: [],
        sells: [],
        cls: op.assetClass,
      };
      this.assets.set(key, entry);
      this.queues.set(key, { lots: [] });
    }
    return { entry, queue: this.queues.get(key) as Queue };
  }

  move(account: string, asset: string, cls: AssetClass, units: number, unitValue: number | null) {
    const key = `${account}|${asset}`;
    const h = this.balances.get(key) ?? { account, asset, assetClass: cls, units: 0, value: null };
    h.units += units;
    if (unitValue !== null) h.value = unitValue;
    this.balances.set(key, h);
  }

  buy(op: ValuedOp, asset: string, units: number, cost: number, date = op.date) {
    const cls = asset === op.asset ? op.assetClass : op.toClass ?? op.assetClass;
    const { entry, queue } = this.asset({ ...op, assetClass: cls }, asset);
    entry.buys.push({ date, units, cost: round2(cost) });
    queue.lots.push({ date, units, cost });
    queue.lots.sort((a, b) => a.date.localeCompare(b.date));
    this.move(op.account, asset, cls, units, units > 0 ? cost / units : null);
  }

  sell(op: ValuedOp, units: number, proceeds: number, untaxed = false) {
    const { entry, queue } = this.asset(op);
    const counterpart = untaxed || op.assetClass !== 'crypto' ? undefined : counterpartOf(op);
    entry.sells.push({
      date: op.date,
      units,
      proceeds: round2(proceeds),
      untaxed: untaxed || undefined,
      counterpart,
    });
    const result = take(queue, units);
    this.move(
      op.account,
      op.asset,
      op.assetClass,
      -units,
      units > 0 && !untaxed ? proceeds / units : null
    );
    return result;
  }
}

/** Transfers in and out of the same coin, about the same amount, within ten days: own wallets. */
function pairTransfers(ops: ValuedOp[], warnings: InvestWarning[]) {
  const outs = ops.filter((o) => o.kind === 'transferOut' && o.assetClass !== 'fiat');
  const ins = ops.filter((o) => o.kind === 'transferIn' && o.assetClass !== 'fiat');
  const used = new Set<string>();
  const days = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;
  const close = (a: ValuedOp, b: ValuedOp) =>
    a.asset === b.asset &&
    !used.has(b.id) &&
    days(a.date, b.date) <= 10 &&
    Math.abs(a.units - b.units) <= Math.max(a.units, b.units) * 0.02 + a.fee;
  for (const out of outs) {
    const match = ins.find((i) => close(out, i));
    if (match) used.add(match.id);
    else once(warnings, { code: 'unmatchedTransfer', asset: out.asset, opId: out.id });
  }
  for (const i of ins)
    if (!used.has(i.id))
      once(warnings, { code: 'transferWithoutOrigin', asset: i.asset, opId: i.id });
}

/** On-chain transfers of one transaction that give one token and get another: a swap (DeFi). */
export function swapsOnChain(ops: InvestOp[]): InvestOp[] {
  const byTx = new Map<string, InvestOp[]>();
  for (const op of ops) if (op.tx) byTx.set(op.tx, [...(byTx.get(op.tx) ?? []), op]);
  const out = ops.filter((o) => !o.tx);
  for (const list of byTx.values()) {
    const gone = list.filter((o) => o.kind === 'transferOut');
    const got = list.filter((o) => o.kind === 'transferIn');
    const rest = list.filter((o) => o.kind !== 'transferOut' && o.kind !== 'transferIn');
    if (gone.length === 1 && got.length === 1 && gone[0].asset !== got[0].asset) {
      const [g, r] = [gone[0], got[0]];
      out.push(
        {
          ...g,
          kind: 'swap',
          toAsset: r.asset,
          toUnits: r.units,
          toClass: 'crypto',
          toEur: null,
          eur: null,
        },
        ...rest
      );
    } else out.push(...list);
  }
  return out;
}

/**
 * A coin with no euros in its row (a swap, a reward of a ledger export) takes the price per unit of
 * the same coin on the same day, or the nearest within three days, from another row that has it.
 * Shown as a warning: the market value of the day is what counts (art. 37.1.h), to check.
 */
export function inferPrices(ops: ValuedOp[], warnings: InvestWarning[]): ValuedOp[] {
  const prices = new Map<string, { date: string; price: number }[]>();
  const add = (asset: string, date: string, eur: number | null | undefined, units: number) => {
    if (!eur || units <= 0) return;
    prices.set(asset, [...(prices.get(asset) ?? []), { date, price: eur / units }]);
  };
  for (const op of ops) {
    if (op.assetClass === 'fiat' || !['buy', 'sell', 'swap', 'reward'].includes(op.kind)) continue;
    add(op.asset, op.date, op.value, op.units);
    if (op.toAsset) add(op.toAsset, op.date, op.toEur ?? op.value, op.toUnits ?? 0);
  }
  const near = (asset: string, date: string) => {
    const day = Date.parse(date);
    const list = (prices.get(asset) ?? [])
      .map((p) => ({ ...p, gap: Math.abs(Date.parse(p.date) - day) / 86400000 }))
      .filter((p) => p.gap <= 3)
      .sort((a, b) => a.gap - b.gap);
    return list[0]?.price ?? null;
  };
  return ops.map((op) => {
    if (op.value !== null || !['swap', 'reward', 'buy', 'sell'].includes(op.kind)) return op;
    const own = near(op.asset, op.date);
    const got = op.toAsset ? near(op.toAsset, op.date) : null;
    const value = own !== null ? own * op.units : got !== null ? got * (op.toUnits ?? 0) : null;
    if (value === null) return op;
    once(warnings, { code: 'inferredPrice', asset: op.asset, opId: op.id });
    return { ...op, value: round2(value) };
  });
}

const REWARD_BOX: Record<string, Pick<IncomeLine, 'what' | 'box' | 'base'>> = {
  staking: { what: 'staking', box: '0027', base: 'savings' },
  lending: { what: 'lending', box: '0027', base: 'savings' },
  airdrop: { what: 'other', box: '0304', base: 'general' },
  cashback: { what: 'other', box: '0304', base: 'general' },
  referral: { what: 'other', box: '0304', base: 'general' },
  learn: { what: 'other', box: '0304', base: 'general' },
  mining: { what: 'activity', box: '—', base: 'activity' },
};

/**
 * The operations with every amount already in euros (value, fee, withholding, cost), so that they
 * can be kept and worked out again later without the exchange rates (taking one file out).
 */
export function inEuros(input: InvestOp[], rates: RateTable): InvestOp[] {
  const warnings: InvestWarning[] = [];
  const valued = inferPrices(
    swapsOnChain(input).map((op) => valueOf(op, rates, warnings)),
    warnings
  );
  const euros = (amount: number, currency: string | null, date: string) =>
    toEur(amount, currency, date, rates, FIAT).eur ?? 0;
  return valued.map(({ value, feeEur, ...op }) => ({
    ...op,
    eur: value,
    amount: value,
    currency: 'EUR',
    fee: feeEur > 0 ? feeEur : op.fee,
    feeCurrency: feeEur > 0 ? 'EUR' : op.feeCurrency ?? op.currency,
    withholding: op.withholding && euros(op.withholding, op.currency, op.date),
    cost: op.cost === undefined ? undefined : euros(op.cost, op.currency, op.acquired ?? op.date),
  }));
}

/** Works out the figures of `year` from every operation of every year. */
export function buildLedger(input: InvestOp[], options: LedgerOptions): LedgerResult {
  const warnings: InvestWarning[] = [];
  const ops = inferPrices(
    swapsOnChain(input)
      .map((op) => valueOf(op, options.rates, warnings))
      .sort((a, b) => a.at.localeCompare(b.at)),
    warnings
  );
  const inYear = (date: string) => date.startsWith(`${options.year}-`);
  const book = new Book();
  const capital = emptyCapital();
  const generalGains: number[] = [];
  const direct: DirectGain[] = [];
  const income: IncomeLine[] = [];
  const foreign = new Map<string, ForeignTax>();
  const withheld = { capital: 0, gains: 0 };
  const switches: { op: ValuedOp; lots: Lot[] }[] = [];
  const years: LedgerResult['years'] = {};
  const year = (date: string) => {
    const y = Number(date.slice(0, 4));
    years[y] = years[y] ?? { savings: 0, general: 0 };
    return years[y];
  };

  const addIncome = (op: ValuedOp, line: Omit<IncomeLine, 'date' | 'account' | 'asset'>) => {
    if (line.base !== 'activity') year(op.date)[line.base] += line.eur;
    if (!inYear(op.date)) return;
    income.push({ date: op.date, account: op.account, asset: op.asset, ...line });
  };

  /** An amount of the file in euros with the rate of its day; 0 when the rate is missing (warned). */
  const euros = (amount: number, currency: string | null, date: string) =>
    toEur(amount, currency, date, options.rates, FIAT).eur ?? 0;

  const missingPrice = (op: ValuedOp) =>
    once(warnings, { code: 'missingPrice', asset: op.asset, opId: op.id });

  for (const op of ops) {
    if (op.feesMissing) once(warnings, { code: 'noFees', asset: op.account });
    const value = op.value ?? 0;
    const feeUnits = coinFee(op);
    if (feeUnits && feeUnits !== op.asset && feeUnits !== op.toAsset) {
      // A fee in a third coin (BNB, BEST): those coins leave without a sale of their own.
      once(warnings, { code: 'feeInCoins', asset: feeUnits });
      book.sell({ ...op, asset: feeUnits, assetClass: 'crypto', isin: undefined }, op.fee, 0, true);
    }
    const ownFee = feeUnits === op.asset ? op.fee : 0;
    const toFee = feeUnits === op.toAsset ? op.fee : 0;
    if (op.value === null && ['buy', 'sell', 'swap', 'reward', 'realized'].includes(op.kind))
      if (!(op.kind === 'swap' && op.toEur)) missingPrice(op);

    switch (op.kind) {
      case 'buy':
        book.buy(op, op.asset, op.units - ownFee, value + op.feeEur);
        break;
      case 'sell': {
        const { missing } = book.sell(op, op.units, value - op.feeEur);
        if (missing) once(warnings, { code: 'missingPurchase', asset: op.asset, opId: op.id });
        // A fund repayment withholds 19 % of the gain in Spain (box 0603).
        if (op.withholding && inYear(op.date))
          withheld.gains += euros(op.withholding, op.currency, op.date);
        break;
      }
      case 'swap': {
        // Art. 37.1.h: the higher of the market values of what is given and what is received.
        const tv = Math.max(value, op.toEur ?? 0);
        const { missing } = book.sell(op, op.units + ownFee, tv - op.feeEur);
        if (missing) once(warnings, { code: 'missingPurchase', asset: op.asset, opId: op.id });
        book.buy(op, op.toAsset as string, (op.toUnits ?? 0) - toFee, tv);
        if (/^DeFi/.test(op.note ?? ''))
          once(warnings, { code: 'defi', asset: op.asset, opId: op.id });
        break;
      }
      case 'reward': {
        const kind = op.reward ?? 'airdrop';
        if (kind === 'fork') {
          once(warnings, { code: 'fork', asset: op.asset });
          book.buy(op, op.asset, op.units, 0);
          break;
        }
        book.buy(op, op.asset, op.units, value);
        const place = options.professional ? REWARD_BOX.mining : REWARD_BOX[kind];
        if (place.base === 'activity') once(warnings, { code: 'mining', asset: op.asset });
        addIncome(op, { ...place, eur: round2(value), withheld: 0, withheldIn: 'origin' });
        if (!inYear(op.date)) break;
        if (place.base === 'savings') capital.interest += value;
        if (place.base === 'general') generalGains.push(round2(value));
        break;
      }
      case 'transferOut':
        if (ownFee) {
          once(warnings, { code: 'feeInCoins', asset: op.asset });
          book.sell(op, ownFee, 0, true);
        }
        book.move(op.account, op.asset, op.assetClass, -(op.units - ownFee), null);
        break;
      case 'transferIn':
        book.move(op.account, op.asset, op.assetClass, op.units, null);
        break;
      case 'fee':
        once(warnings, { code: 'feeInCoins', asset: op.asset });
        book.sell(op, op.units, 0, true);
        break;
      case 'dividend':
      case 'interest': {
        const where = op.withheldIn ?? options.withheldIn?.[op.format] ?? 'origin';
        const tax = op.withholding ? euros(op.withholding, op.currency, op.date) : 0;
        addIncome(op, {
          what: op.kind,
          box: op.kind === 'dividend' ? '0029' : '0027',
          base: 'savings',
          eur: round2(value),
          withheld: round2(tax),
          withheldIn: where,
        });
        if (!inYear(op.date)) break;
        capital[op.kind === 'dividend' ? 'dividends' : 'interest'] += value;
        if (where === 'spain') withheld.capital += tax;
        else {
          const f = foreign.get(op.asset) ?? { income: 0, tax: 0 };
          foreign.set(op.asset, { income: f.income + value, tax: f.tax + tax });
        }
        break;
      }
      case 'custody':
        if (inYear(op.date)) {
          capital.expenses += value;
          income.push({
            date: op.date,
            account: op.account,
            asset: op.asset,
            what: 'custody',
            eur: round2(value),
            withheld: 0,
            withheldIn: 'origin',
            box: '0037',
            base: 'savings',
          });
        }
        break;
      case 'switchOut': {
        if (op.assetClass === 'etf') once(warnings, { code: 'switchEtf', asset: op.asset });
        const { taken, missing } = book.sell(op, op.units, 0, true);
        if (missing) once(warnings, { code: 'missingPurchase', asset: op.asset, opId: op.id });
        switches.push({ op, lots: taken });
        break;
      }
      case 'switchIn': {
        const days = (s: ValuedOp) => Math.abs(Date.parse(s.date) - Date.parse(op.date)) / 86400000;
        const pair = switches.find((s) => days(s.op) <= 15);
        if (pair) {
          switches.splice(switches.indexOf(pair), 1);
          const total = pair.lots.reduce((s, l) => s + l.units, 0) || 1;
          for (const lot of pair.lots)
            book.buy(op, op.asset, (op.units * lot.units) / total, lot.cost, lot.date);
        } else if (op.cost !== undefined) {
          const acquired = op.acquired ?? op.date;
          book.buy(op, op.asset, op.units, euros(op.cost, op.currency, acquired), acquired);
        } else {
          once(warnings, { code: 'switchInCost', asset: op.asset, opId: op.id });
          book.buy(op, op.asset, op.units, value);
        }
        break;
      }
      case 'realized': {
        const acquired = op.acquired ?? op.date;
        const cost = euros(op.cost ?? 0, op.currency, acquired);
        if (op.assetClass === 'derivative') {
          once(warnings, { code: 'derivative', asset: op.account });
          const gain = round2(value - cost);
          year(op.date).savings += gain;
          if (inYear(op.date))
            direct.push({
              date: op.date,
              acquired,
              account: op.account,
              asset: op.asset,
              underlying: op.underlying,
              proceeds: round2(value),
              cost: round2(cost),
              gain,
            });
          break;
        }
        once(warnings, { code: 'realizedMatching', asset: op.format });
        book.buy(op, op.asset, op.units, cost, acquired);
        book.sell(op, op.units, value);
        break;
      }
      case 'split':
        once(warnings, { code: 'split', asset: op.asset });
        break;
      /* ignore */
    }
  }

  for (const s of switches)
    once(warnings, { code: 'switchWithoutPair', asset: s.op.asset, opId: s.op.id });
  pairTransfers(ops, warnings);

  // Treasury bills and bonds: what the FIFO gives is capital mobiliario (box 0031), not a gain.
  const assets: AssetOps[] = [];
  const history: LedgerResult['history'] = [];
  for (const entry of book.assets.values()) {
    const { cls, ...asset } = entry;
    const sales = fifo(asset).map((s) => ({ ...s, code: asset.code as string }));
    for (const s of sales) {
      if (s.unmatched > 1e-9) once(warnings, { code: 'missingPurchase', asset: asset.name });
      if (s.checkRepurchase) once(warnings, { code: 'repurchase', asset: asset.name });
      if (cls !== 'bond') year(s.date).savings += s.gain + s.deferred;
    }
    if (cls === 'bond') {
      for (const s of sales) {
        year(s.date).savings += s.gain;
        if (inYear(s.date)) capital.assets += s.gain;
      }
      continue;
    }
    if (cls === 'fiat') continue;
    history.push(...sales);
    assets.push(asset);
  }

  const lossYears = Object.entries(years).filter(
    ([y, r]) => Number(y) < options.year && r.savings + r.general !== 0
  );
  if (lossYears.length) once(warnings, { code: 'earlierYears' });
  if (lossYears.some(([, r]) => r.savings < 0)) once(warnings, { code: 'lossYears' });

  const holdings = [...book.balances.values()]
    .filter((h) => h.units > 1e-9 && h.assetClass !== 'fiat')
    .map((h) => ({ ...h, value: h.value === null ? null : round2(h.value * h.units) }));
  const abroad = (cls: (c: AssetClass) => boolean) =>
    holdings
      .filter((h) => cls(h.assetClass) && !SPANISH.test(h.account) && !SELF.test(h.account))
      .reduce((s, h) => s + (h.value ?? 0), 0);
  // Orden HFP/886/2023 (modelo 721) and Orden HAP/72/2013 (modelo 720): over 50,000 € abroad.
  const crypto = abroad((c) => c === 'crypto');
  if (crypto > 50000) once(warnings, { code: 'model721', amount: round2(crypto) });
  const securities = abroad((c) => c !== 'crypto');
  if (securities > 50000) once(warnings, { code: 'model720', amount: round2(securities) });

  const derivativeGains = direct.map((d) => d.gain);
  const r = (n: number) => round2(n);
  return {
    year: options.year,
    ops,
    imported: {
      files: [],
      capital: {
        interest: r(capital.interest),
        dividends: r(capital.dividends),
        assets: r(capital.assets),
        insurance: 0,
        expenses: r(capital.expenses),
      },
      assets,
      generalGains: options.professional ? [] : generalGains,
      otherGains: options.professional ? [] : derivativeGains,
      withheld: { capital: r(withheld.capital), gains: r(withheld.gains) },
      foreignTax: [...foreign.values()]
        .filter((f) => f.tax > 0)
        .map((f) => ({ income: r(f.income), tax: r(f.tax) })),
    },
    sales: history.filter((s) => inYear(s.date)),
    history,
    direct,
    income,
    holdings,
    years: Object.fromEntries(
      Object.entries(years).map(([y, v]) => [y, { savings: r(v.savings), general: r(v.general) }])
    ),
    warnings,
  };
}

export type { GainSection };
