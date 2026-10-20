import { norm, parseMoney, parseWhen, type Cell, type DateOrder, type NumberLocale } from './text';
import type { AssetClass, InvestOp, OpKind, RewardKind } from './types';

/**
 * The generic reader: a format (formats.ts) says which header names its columns have and what the
 * words of its type column mean; this turns each row into operations. Nothing leaves the device.
 */

/** A table of a file: a CSV, a sheet of a workbook, a section of a statement. */
export interface Table {
  name: string;
  rows: Cell[][];
}

export type Field =
  | 'date'
  | 'time'
  | 'type'
  | 'side'
  | 'asset'
  | 'units'
  | 'price'
  | 'priceCurrency'
  | 'amount'
  | 'currency'
  | 'fee'
  | 'feeCurrency'
  | 'pair'
  | 'toAsset'
  | 'toUnits'
  | 'isin'
  | 'name'
  | 'class'
  | 'withholding'
  | 'cost'
  | 'acquired'
  | 'group'
  | 'status'
  | 'note';

/** What a word of the type column means: a kind, and for rewards which one. */
export type TypeRule = [RegExp, OpKind, RewardKind?];

/** The money assets: what an amount is paid in, never a holding with gains of its own. */
export const FIAT = new Set([
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'JPY',
  'CAD',
  'AUD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'MXN',
  'BRL',
  'TRY',
  'HKD',
  'SGD',
  'ZAR',
  'NZD',
]);

/** Reads the cells of a row by field, through the column names of its format. */
export class RowReader {
  constructor(
    readonly cells: Cell[],
    private readonly index: Partial<Record<Field, number>>,
    readonly header: string[],
    readonly locale: NumberLocale
  ) {}

  cell(field: Field): Cell {
    const i = this.index[field];
    return i === undefined ? null : (this.cells[i] ?? null);
  }

  /** The cell under a header found by its exact (normalised) name. */
  byHeader(name: string): Cell {
    const i = this.header.indexOf(name);
    return i < 0 ? null : (this.cells[i] ?? null);
  }

  text(field: Field): string {
    return String(this.cell(field) ?? '').trim();
  }

  /** The number of a cell (NaN when empty or not a number) and the currency written in it. */
  money(field: Field) {
    return parseMoney(this.cell(field), this.locale);
  }

  num(field: Field): number {
    const { value } = this.money(field);
    return Number.isFinite(value) ? value : 0;
  }
}

/** How a format's rows become operations. */
export interface FormatSpec {
  id: string;
  platform: string;
  /** Which file of the platform it is, in words. */
  file: string;
  category: 'crypto' | 'broker' | 'fund';
  /** The public page that describes the export. */
  docs: string;
  /** Date the columns were checked against a real export; null: NO CONFIRMADO. */
  confirmed: string | null;
  /** Header names (normalised, exact or prefix) that all have to be in the header row. */
  signature: string[];
  /** And at least one of these (a sheet whose date column has several names). */
  anyOf?: string[];
  locale: NumberLocale;
  order: DateOrder;
  /** Header names of each field, the first one found wins; ">name" is the column after "name". */
  columns: Partial<Record<Field, string[]>>;
  types: TypeRule[];
  defaultClass: AssetClass;
  /** Where the withholding of its dividends is paid (a Spanish entity or the source country). */
  withheldIn?: 'origin' | 'spain';
  /** rows: one operation per row; legs: rows are balance changes grouped into operations. */
  shape: 'rows' | 'legs';
  /**
   * For platforms with an odd row: what to read instead of the generic reading. null: a row it does
   * not understand (counted as skipped); undefined: read it the generic way.
   */
  row?: (r: RowReader, base: InvestOp, ctx: FormatContext) => InvestOp[] | null | undefined;
  /**
   * The name of the sheet it has to be on (a workbook with one sheet per kind of operation, as
   * Binance's statement): with it, the header can be looser.
   */
  sheet?: RegExp;
  /** Something worked out from the whole table first (the address of a wallet...). */
  prepare?: (rows: RowReader[]) => FormatContext;
}

export type FormatContext = Record<string, string>;

const matches = (header: string, name: string) => header === name || header.startsWith(name);

/** The column of each field in a header row. */
export function indexOf(
  header: string[],
  columns: FormatSpec['columns']
): Partial<Record<Field, number>> {
  const index: Partial<Record<Field, number>> = {};
  for (const [field, names] of Object.entries(columns) as [Field, string[]][]) {
    for (const name of names) {
      const after = name.startsWith('>');
      const wanted = after ? name.slice(1) : name;
      // Exact names first, so "fee" does not take "fee currency".
      let i = header.indexOf(wanted);
      if (i < 0) i = header.findIndex((h) => matches(h, wanted));
      if (i >= 0) {
        index[field] = after ? i + 1 : i;
        break;
      }
    }
  }
  return index;
}

/** The format whose signature the header row has. */
export function fits(header: string[], spec: FormatSpec): boolean {
  const has = (name: string) => header.some((h) => matches(h, name));
  return spec.signature.every(has) && (!spec.anyOf || spec.anyOf.some(has));
}

/** The meaning of a type word: the first rule that matches. */
export function kindOf(text: string, rules: TypeRule[]): [OpKind, RewardKind?] | null {
  const word = norm(text);
  const rule = rules.find(([re]) => re.test(word));
  return rule ? [rule[1], rule[2]] : null;
}

const QUOTES = [
  'ZEUR',
  'ZUSD',
  'ZGBP',
  'EUR',
  'USDT',
  'USDC',
  'FDUSD',
  'BUSD',
  'USD',
  'GBP',
  'CHF',
  'XXBT',
  'XBT',
  'BTC',
  'XETH',
  'ETH',
  'BNB',
];

/** "BTC-EUR", "BTC/EUR", "BTCEUR", "XXBTZEUR": the asset and what it is priced in. */
export function splitPair(pair: string): [string, string] | null {
  const text = pair.trim().toUpperCase();
  const parts = text.split(/[-/_ ]/).filter(Boolean);
  if (parts.length === 2) return [parts[0], parts[1]];
  const quote = QUOTES.find((q) => text.endsWith(q) && text.length > q.length);
  return quote ? [text.slice(0, -quote.length), quote] : null;
}

/** Kraken's old asset codes: XXBT → BTC, ZEUR → EUR, staked "ETH2.S" → ETH. */
export function cleanAsset(code: string): string {
  const upper = code
    .trim()
    .toUpperCase()
    .replace(/\.[A-Z]$/, '');
  // Kraken's old codes, and Nexo's money tokens (EURX is its euro balance).
  const known: Record<string, string> = {
    XBT: 'BTC',
    XXBT: 'BTC',
    XDG: 'DOGE',
    XXDG: 'DOGE',
    EURX: 'EUR',
    USDX: 'USD',
    GBPX: 'GBP',
  };
  if (known[upper]) return known[upper];
  if (upper === 'ETH2') return 'ETH';
  // Kraken's four letter codes: X for coins, Z for money (XETH, XXRP, ZEUR, ZUSD).
  if (/^[XZ][A-Z]{3}$/.test(upper) && !['ZEC', 'XTZ'].includes(upper.slice(1)))
    return upper.slice(1);
  return upper;
}

const ETF_WORDS =
  /\b(etf|ucits|ishares|vanguard|xtrackers|amundi|lyxor|spdr|invesco|wisdomtree|vaneck)\b/i;

/** A security looks like an ETF by its name (the user can change the class in the table). */
export function brokerClass(name: string, fallback: AssetClass): AssetClass {
  return fallback === 'shares' && ETF_WORDS.test(name) ? 'etf' : fallback;
}

/** The base of an operation of a row: what every format reads the same way. */
function baseOf(spec: FormatSpec, r: RowReader, id: string, account: string): InvestOp | null {
  const when = parseWhen(r.cell('date'), spec.order);
  if (!when) return null;
  const time = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(r.text('time'));
  const at = time
    ? `${when.date}T${time[1].padStart(2, '0')}:${time[2]}:${time[3] ?? '00'}`
    : when.at;
  const pair = splitPair(r.text('pair'));
  const asset = cleanAsset(r.text('asset') || pair?.[0] || r.text('isin') || r.text('name'));
  const amount = r.money('amount');
  const fee = r.money('fee');
  const units = r.money('units');
  const name = r.text('name');
  const fiat = FIAT.has(asset);
  return {
    id,
    format: spec.id,
    account,
    date: when.date,
    at,
    kind: 'ignore',
    asset,
    assetClass: fiat ? 'fiat' : brokerClass(`${name} ${asset}`, spec.defaultClass),
    name: name || undefined,
    isin: r.text('isin') || undefined,
    units: Math.abs(Number.isFinite(units.value) ? units.value : 0),
    amount: Number.isFinite(amount.value) ? Math.abs(amount.value) : null,
    currency:
      cleanCurrency(r.text('currency')) ??
      amount.currency ??
      (pair ? cleanAsset(pair[1]) : null) ??
      cleanCurrency(r.text('priceCurrency')),
    eur: null,
    fee: Math.abs(Number.isFinite(fee.value) ? fee.value : 0),
    feeCurrency: cleanCurrency(r.text('feeCurrency')) ?? fee.currency,
    note: r.text('note') || r.text('type') || undefined,
    withholding: r.text('withholding') ? Math.abs(r.num('withholding')) : undefined,
    cost: r.text('cost') ? Math.abs(r.num('cost')) : undefined,
    acquired: parseWhen(r.cell('acquired'), spec.order)?.date,
  };
}

const cleanCurrency = (text: string): string | null => (text ? cleanAsset(text) : null);

/** One row of a "rows" format: its kind from the type column, or from the sign of the units. */
function rowOps(spec: FormatSpec, r: RowReader, base: InvestOp): InvestOp[] | null {
  const typeWord = `${r.text('type')} ${r.text('side')}`.trim();
  const found = kindOf(typeWord, spec.types);
  const signed = r.money('units').value;
  // A type word that no rule knows is not guessed from the sign of the units.
  const bySign = typeWord ? null : signed < 0 ? 'sell' : signed > 0 ? 'buy' : null;
  const kind: OpKind | null = found?.[0] ?? bySign;
  if (!kind) return null;
  const op: InvestOp = { ...base, kind, reward: found?.[1] };
  if (r.text('price') && op.amount === null) op.amount = op.units * Math.abs(r.num('price'));
  if (r.text('toAsset')) {
    op.toAsset = cleanAsset(r.text('toAsset'));
    op.toUnits = Math.abs(r.num('toUnits'));
  }
  return [fromTo(op)];
}

/**
 * A row that names what was given and what was received: money given is a purchase of what was
 * received, money received is a sale, and two assets are a swap (permuta, LIRPF art. 37.1.h).
 */
export function fromTo(op: InvestOp): InvestOp {
  if (!op.toAsset || !['swap', 'buy', 'sell'].includes(op.kind)) return op;
  const given = { asset: op.asset, units: op.units };
  const got = { asset: op.toAsset, units: op.toUnits ?? 0 };
  const plain = { ...op, toAsset: undefined, toUnits: undefined };
  if (FIAT.has(given.asset) && !FIAT.has(got.asset))
    return {
      ...plain,
      kind: 'buy',
      asset: got.asset,
      assetClass: op.toClass ?? 'crypto',
      units: got.units,
      amount: op.amount ?? given.units,
      currency: op.currency ?? given.asset,
    };
  if (FIAT.has(got.asset) && !FIAT.has(given.asset))
    return {
      ...plain,
      kind: 'sell',
      amount: op.amount ?? got.units,
      currency: op.currency ?? got.asset,
    };
  return { ...op, kind: 'swap', toClass: op.toClass ?? op.assetClass };
}

/** A balance change of a "legs" format: grouped by its group column (or moment) into operations. */
interface Leg {
  base: InvestOp;
  change: number;
  rule: [OpKind, RewardKind?] | null;
  group: string;
}

/** The legs of one group (a trade, a convert, a reward) as operations. */
export function legsToOps(legs: Leg[]): InvestOp[] {
  const out: InvestOp[] = [];
  const trade: Leg[] = [];
  for (const leg of legs) {
    const [kind, reward] = leg.rule ?? ['swap'];
    const units = Math.abs(leg.change);
    if (kind === 'ignore' || units === 0) continue;
    // A fee written on a leg is paid in that leg's asset.
    const op = { ...leg.base, units, feeCurrency: leg.base.feeCurrency ?? leg.base.asset };
    if (kind === 'reward') out.push({ ...op, kind, reward, amount: op.amount, eur: op.eur });
    else if (kind === 'transferIn' || kind === 'transferOut') {
      const dir = leg.change > 0 ? 'transferIn' : 'transferOut';
      if (op.assetClass !== 'fiat') out.push({ ...op, kind: dir });
    } else trade.push({ ...leg, base: op });
  }
  return [...out, ...tradeOps(trade)];
}

/** Sums the legs of a trade by asset: given (negative), received (positive) and fees. */
function tradeOps(legs: Leg[]): InvestOp[] {
  if (legs.length === 0) return [];
  const fees = legs.filter((l) => l.rule?.[0] === 'fee');
  const moves = legs.filter((l) => !fees.includes(l));
  // Only a fee (a network fee): the coins leave without a trade.
  if (moves.length === 0) return fees.map((f) => ({ ...f.base, kind: 'fee' as const }));
  const total = (list: Leg[]) => {
    const by = new Map<string, Leg>();
    for (const l of list) {
      const prev = by.get(l.base.asset);
      by.set(l.base.asset, prev ? { ...prev, change: prev.change + l.change } : l);
    }
    return [...by.values()];
  };
  const given = total(moves.filter((l) => l.change < 0));
  const got = total(moves.filter((l) => l.change > 0));
  // A fee leg (Binance), or the fee written on a leg in that leg's asset (Kraken).
  const feeLeg = fees[0]?.base;
  const onLeg = legs.find((l) => l.base.fee > 0)?.base;
  const feeOf = feeLeg
    ? { fee: feeLeg.units, feeCurrency: feeLeg.asset }
    : { fee: onLeg?.fee ?? 0, feeCurrency: onLeg?.asset ?? null };
  // One thing given for one received; a dust conversion (many for one) is split evenly.
  if (given.length === 0 || got.length === 0) {
    // One side is not in the file (paid by card, spent on something): the price is asked for.
    return [...got, ...given].map((g) => ({
      ...g.base,
      kind: g.change > 0 ? ('buy' as const) : ('sell' as const),
      units: Math.abs(g.change),
      ...feeOf,
    }));
  }
  return given.flatMap((g) =>
    got.map((r) =>
      fromTo({
        ...g.base,
        kind: 'swap',
        units: -g.change / got.length,
        toAsset: r.base.asset,
        toClass: r.base.assetClass,
        toUnits: r.change / given.length,
        amount: FIAT.has(g.base.asset) ? -g.change : FIAT.has(r.base.asset) ? r.change : null,
        currency: FIAT.has(g.base.asset)
          ? g.base.asset
          : FIAT.has(r.base.asset)
            ? r.base.asset
            : null,
        eur: g.base.eur ?? r.base.eur,
        toEur: r.base.eur,
        ...feeOf,
      })
    )
  );
}

/** Reads the rows under a header with a format; returns the operations and the rows it skipped. */
export function readWith(
  spec: FormatSpec,
  rows: Cell[][],
  headerRow: number,
  source: string,
  table = ''
): { ops: InvestOp[]; skipped: number; rows: number } {
  const header = rows[headerRow].map(norm);
  const index = indexOf(header, spec.columns);
  const body = rows
    .slice(headerRow + 1)
    .filter((cells) => cells.some((c) => c !== null && String(c).trim() !== ''));
  const readers = body.map((cells) => new RowReader(cells, index, header, spec.locale));
  const ctx = { table, ...spec.prepare?.(readers) };
  const ops: InvestOp[] = [];
  const legs: Leg[] = [];
  let skipped = 0;
  readers.forEach((r, i) => {
    const base = baseOf(spec, r, `${source}:${headerRow + i + 2}`, spec.platform);
    if (!base) {
      skipped++;
      return;
    }
    const read = spec.row ? spec.row(r, base, ctx) : undefined;
    if (read === undefined && spec.shape === 'legs')
      legs.push({
        base,
        change: r.money('units').value || 0,
        rule: kindOf(r.text('type'), spec.types),
        group: r.text('group') || base.at,
      });
    else {
      const got = read === undefined ? rowOps(spec, r, base) : read;
      if (got) ops.push(...got);
      else skipped++;
    }
  });
  const groups = new Map<string, Leg[]>();
  for (const leg of legs) groups.set(leg.group, [...(groups.get(leg.group) ?? []), leg]);
  for (const group of groups.values()) ops.push(...legsToOps(group));
  return { ops, skipped, rows: body.length };
}
