import windows2025 from '../../data/renta/web/ventanas-2025.json';
import type { Counterpart, GainSection } from '../rentaGains';
import { round2 } from '../round';
import { SPANISH, type LedgerResult } from './ledger';

/** A sale of the year with its ISIN or ticker. */
type SaleResult = LedgerResult['sales'][number];

/**
 * What to type in each window of Renta WEB (apartado F2), one «alta» at a time, with the labels
 * and the order of the window (data/renta/web/ventanas-<year>.json, from the official dictionary
 * of the year). There is no way to import gains into Renta WEB: this is what the person copies.
 * Grouping (docs/fiscalidad/como-declarar-cripto-y-fondos.md §5 and §7): one alta per asset ×
 * key × sign, so the totals (1813/1814, 0324/0325, 2235/2236, 0339/0340) are the same as declaring
 * each sale; a loss kept back by a repurchase goes in an alta of its own with the mark.
 */

export type WebSection = Exclude<GainSection, never>;

interface FieldDef {
  key: string;
  label: string;
  box?: string;
  max?: number;
}

interface WindowDef {
  title: string;
  help: string;
  limit: number;
  transactions?: number;
  fields: FieldDef[];
  keys?: Record<string, string>;
  typeValue?: string;
  results: Record<string, string>;
  totals: { gains: string; losses: string };
}

export const WINDOWS = windows2025.windows as Record<WebSection, WindowDef>;
export const WINDOWS_SOURCE = { source: windows2025.source, checked: windows2025.checked };
export const APARTADO = windows2025.apartado;

/** One alta: the values of its fields (by key), what Renta WEB will work out, and for whom. */
export interface Alta {
  n: number;
  values: Record<string, string | number>;
  /** Full name of the asset, for the person (the field may be cut to its length). */
  name: string;
  /** How many sales (or positions) it groups. */
  sales: number;
  /** Renta WEB's result: transmission − acquisition; the loss counts unless the mark is on. */
  gain: number;
  loss: number;
  counted: number;
  blocked: boolean;
  /** It may already be in the tax data of Renta WEB (a Spanish fund or depositary). */
  fiscalData: boolean;
  /** Shares: the transactions of the issuer (one alta per issuer). */
  transactions?: Alta[];
}

export interface WebWindow {
  section: WebSection;
  def: WindowDef;
  altas: Alta[];
  totals: { gains: number; losses: number };
}

export type KitWarning =
  | { code: 'grouped'; section: WebSection; sales: number; altas: number }
  | { code: 'mergedSigns' | 'overLimit'; section: WebSection; limit: number }
  | { code: 'fiscalData' | 'carteraValores' | 'etfOwn' };

export interface RentaWebKit {
  year: number;
  windows: WebWindow[];
  /** Box → amount: the totals of the windows and the capital income. */
  totals: { box: string; label: string; amount: number }[];
  warnings: KitWarning[];
  /** The alta of each sale (by sale index in ledger.sales) or position (by direct index). */
  altaOfSale: Map<SaleResult, number>;
  /** The alta of each position of `ledger.direct`, by its index. */
  altaOfDirect: number[];
}

/**
 * How the positions of «otros elementos» go into altas: one per position (the default), one per
 * instrument, month of closing and sign, or one per instrument and sign (gains and losses). The
 * totals 0385/0386 are the same with any of them: only the number of altas changes.
 */
export type OtherGrouping = 'position' | 'month' | 'sign';
export const OTHER_GROUPINGS: OtherGrouping[] = ['position', 'month', 'sign'];

/** What is copied into Renta WEB: an amount with a decimal comma and no thousands separator. */
export const webValue = (value: string | number) =>
  typeof value === 'number' ? value.toFixed(2).replace('.', ',') : value;

/** Cut a text to a field's length without cutting a word in two when it can. */
export function cut(text: string, max?: number): string {
  if (!max || text.length <= max) return text;
  const head = text.slice(0, max + 1);
  const space = head.lastIndexOf(' ');
  return (space > 0 ? head.slice(0, space) : text.slice(0, max)).trim();
}

/** A sale as pieces of one sign: a loss partly kept back is split in its counted and blocked part. */
interface Piece {
  sale: SaleResult;
  proceeds: number;
  cost: number;
  sign: 'gain' | 'loss';
  blocked: boolean;
}

function piecesOf(sale: SaleResult): Piece[] {
  const base = { sale, proceeds: sale.proceeds, cost: sale.cost };
  if (sale.gain >= 0) return [{ ...base, sign: 'gain', blocked: false }];
  if (sale.deferred <= 0) return [{ ...base, sign: 'loss', blocked: false }];
  const share = Math.min(1, sale.deferred / -sale.gain);
  const blocked: Piece = {
    sale,
    proceeds: sale.proceeds * share,
    cost: sale.cost * share,
    sign: 'loss',
    blocked: true,
  };
  if (share >= 1) return [blocked];
  return [
    {
      sale,
      proceeds: sale.proceeds - blocked.proceeds,
      cost: sale.cost - blocked.cost,
      sign: 'loss',
      blocked: false,
    },
    blocked,
  ];
}

/** The pieces summed by a key, in the order they first appear. */
function group(pieces: Piece[], key: (p: Piece) => string): Piece[][] {
  const by = new Map<string, Piece[]>();
  for (const p of pieces) by.set(key(p), [...(by.get(key(p)) ?? []), p]);
  return [...by.values()];
}

const result = (proceeds: number, cost: number, blocked: boolean) => {
  const r = round2(proceeds - cost);
  const loss = Math.max(0, -r);
  return { gain: Math.max(0, r), loss, counted: blocked ? 0 : loss };
};

const sum = (list: Piece[], k: 'proceeds' | 'cost') => round2(list.reduce((s, p) => s + p[k], 0));

/** The altas of one section, merging more as needed to fit its limit (warned). */
function altasOf(
  section: WebSection,
  pieces: Piece[],
  ledger: LedgerResult,
  warnings: KitWarning[],
  altaOfSale: Map<SaleResult, number>
): Alta[] {
  const def = WINDOWS[section];
  const fiscal = fiscalCodes(ledger);
  const withheld = withheldOf(ledger);
  const asset = (p: Piece) => p.sale.code;
  const keys: ((p: Piece) => string)[] =
    section === 'crypto'
      ? [
          (p) => `${p.sale.name}|${p.sale.counterpart}|${p.sign}`,
          (p) => `${p.sale.name}|${p.sale.counterpart}`,
          (p) => p.sale.name,
        ]
      : [(p) => `${asset(p)}|${p.sign}|${p.blocked}`, (p) => `${asset(p)}|${p.blocked}`];
  let groups = group(pieces, keys[0]);
  for (let step = 1; step < keys.length && groups.length > def.limit; step++) {
    groups = group(pieces, keys[step]);
    warnings.push({ code: 'mergedSigns', section, limit: def.limit });
  }
  if (groups.length > def.limit) warnings.push({ code: 'overLimit', section, limit: def.limit });
  const usedWithholding = new Set<string>();
  return groups.map((list, i) => {
    const first = list[0].sale;
    const proceeds = sum(list, 'proceeds');
    const cost = sum(list, 'cost');
    const blocked = list[0].blocked;
    for (const p of list) altaOfSale.set(p.sale, i + 1);
    const values: Record<string, string | number> = {};
    if (section === 'crypto') {
      Object.assign(values, {
        name: cut(first.name, 25),
        // Every crypto sale of the ledger has its key (counterpartOf).
        key: (def.keys as Record<string, string>)[first.counterpart as Counterpart],
        proceeds,
        proceedsCosts: 0,
        cost,
        costCosts: 0,
      });
    } else {
      // The withholding of a fund goes once, with its first alta.
      const tax = usedWithholding.has(first.code) ? 0 : withheld.get(first.code) ?? 0;
      usedWithholding.add(first.code);
      Object.assign(values, {
        nif: '',
        name: cut(first.name, 40),
        isin: /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(first.code) ? first.code : '',
        proceeds,
        cost,
        withheld: tax,
        blocked: blocked ? 'Sí' : 'No',
      });
    }
    return {
      n: i + 1,
      values,
      name: first.name,
      sales: new Set(list.map((p) => p.sale)).size,
      ...result(proceeds, cost, blocked),
      blocked,
      fiscalData: section === 'iic' && fiscal.has(first.code),
    };
  });
}

/** Shares: one alta per issuer with up to three transactions (gains, counted losses, blocked). */
function sharesOf(
  pieces: Piece[],
  ledger: LedgerResult,
  altaOfSale: Map<SaleResult, number>
): Alta[] {
  const fiscal = fiscalCodes(ledger);
  return group(pieces, (p) => p.sale.name).map((list, i) => {
    const transactions = group(list, (p) => `${p.sign}|${p.blocked}`).map((t, j) => {
      const proceeds = sum(t, 'proceeds');
      const cost = sum(t, 'cost');
      return {
        n: j + 1,
        values: { transaction: j + 1, proceeds, cost, blocked: t[0].blocked ? 'Sí' : 'No' },
        name: t[0].sale.name,
        sales: new Set(t.map((p) => p.sale)).size,
        ...result(proceeds, cost, t[0].blocked),
        blocked: t[0].blocked,
        fiscalData: false,
      };
    });
    for (const p of list) altaOfSale.set(p.sale, i + 1);
    const total = (k: 'gain' | 'loss' | 'counted') =>
      round2(transactions.reduce((s, t) => s + t[k], 0));
    return {
      n: i + 1,
      values: { entity: cut(list[0].sale.name, 20) },
      name: list[0].sale.name,
      sales: new Set(list.map((p) => p.sale)).size,
      gain: total('gain'),
      loss: total('loss'),
      counted: total('counted'),
      blocked: false,
      fiscalData: fiscal.has(list[0].sale.code),
      transactions,
    };
  });
}

const date = (iso: string) => iso.split('-').reverse().join('/');

/**
 * Other elements (derivatives, gold): one alta per position or sale while they fit (80); else one
 * per instrument × sign with the first opening and the last closing, and then per instrument.
 */
function othersOf(
  ledger: LedgerResult,
  warnings: KitWarning[],
  altaOfSale: Map<SaleResult, number>,
  altaOfDirect: number[],
  grouping: OtherGrouping
): Alta[] {
  const def = WINDOWS.other;
  interface Pos {
    name: string;
    opened: string;
    closed: string;
    proceeds: number;
    cost: number;
    sale?: SaleResult;
    direct?: number;
  }
  const positions: Pos[] = [
    ...ledger.sales
      .filter((s) => s.section === 'other')
      .map((s) => ({
        name: s.name,
        opened: s.lots[0]?.date ?? s.date,
        closed: s.date,
        proceeds: s.proceeds,
        cost: s.cost,
        sale: s,
      })),
    ...ledger.direct.map((d, direct) => ({
      name: d.asset,
      opened: d.acquired,
      closed: d.date,
      proceeds: d.proceeds,
      cost: d.cost,
      direct,
    })),
  ];
  const sign = (p: Pos) => (p.proceeds >= p.cost ? 'gain' : 'loss');
  const first: Record<OtherGrouping, (p: Pos, i: number) => string> = {
    position: (_p, i) => String(i),
    month: (p) => `${p.name}|${p.closed.slice(0, 7)}|${sign(p)}`,
    sign: (p) => `${p.name}|${sign(p)}`,
  };
  const steps: ((p: Pos, i: number) => string)[] = [
    first[grouping],
    (p) => `${p.name}|${sign(p)}`,
    (p) => p.name,
  ];
  const groupBy = (key: (p: Pos, i: number) => string) => {
    const by = new Map<string, Pos[]>();
    positions.forEach((p, i) => by.set(key(p, i), [...(by.get(key(p, i)) ?? []), p]));
    return [...by.values()];
  };
  let groups = groupBy(steps[0]);
  for (let step = 1; step < steps.length && groups.length > def.limit; step++) {
    groups = groupBy(steps[step]);
    warnings.push({ code: 'mergedSigns', section: 'other', limit: def.limit });
  }
  if (groups.length > def.limit)
    warnings.push({ code: 'overLimit', section: 'other', limit: def.limit });
  return groups.map((list, i) => {
    const proceeds = round2(list.reduce((s, p) => s + p.proceeds, 0));
    const cost = round2(list.reduce((s, p) => s + p.cost, 0));
    for (const p of list) {
      if (p.sale) altaOfSale.set(p.sale, i + 1);
      else altaOfDirect[p.direct as number] = i + 1;
    }
    return {
      n: i + 1,
      values: {
        type: def.typeValue as string,
        onerous: 'Sí',
        sold: date(
          list
            .map((p) => p.closed)
            .sort()
            .at(-1) as string
        ),
        bought: date(list.map((p) => p.opened).sort()[0]),
        proceeds,
        proceedsCosts: 0,
        cost,
        costCosts: 0,
        amortization: 0,
      },
      name: list[0].name,
      sales: list.length,
      ...result(proceeds, cost, false),
      blocked: false,
      fiscalData: false,
    };
  });
}

/** Codes of funds and shares held with a Spanish entity: they may come in the tax data. */
function fiscalCodes(ledger: LedgerResult): Set<string> {
  const codes = new Set<string>();
  for (const op of ledger.ops)
    if (op.kind === 'sell' && (SPANISH.test(op.account) || /^ES/.test(op.isin ?? op.asset)))
      codes.add(op.isin ?? op.asset);
  return codes;
}

/** The withholding of the repayments of each fund in the year (euros). */
function withheldOf(ledger: LedgerResult): Map<string, number> {
  const by = new Map<string, number>();
  for (const op of ledger.ops)
    if (op.kind === 'sell' && op.withholding && op.date.startsWith(`${ledger.year}-`)) {
      const code = op.isin ?? op.asset;
      by.set(code, round2((by.get(code) ?? 0) + op.withholding));
    }
  return by;
}

const ORDER: WebSection[] = ['iic', 'etf', 'shares', 'crypto', 'other'];

/** Every window with its altas, the totals by box and the warnings that go with the file. */
export function rentaWebKit(
  ledger: LedgerResult,
  { other = 'position' }: { other?: OtherGrouping } = {}
): RentaWebKit {
  const warnings: KitWarning[] = [];
  const altaOfSale = new Map<SaleResult, number>();
  const altaOfDirect: number[] = [];
  const pieces = ledger.sales.flatMap(piecesOf);
  const windows: WebWindow[] = [];
  for (const section of ORDER) {
    const own = pieces.filter((p) => p.sale.section === section);
    const altas =
      section === 'other'
        ? othersOf(ledger, warnings, altaOfSale, altaOfDirect, other)
        : section === 'shares'
        ? sharesOf(own, ledger, altaOfSale)
        : altasOf(section, own, ledger, warnings, altaOfSale);
    if (altas.length === 0) continue;
    const sales = altas.reduce((s, a) => s + a.sales, 0);
    if (sales > altas.length)
      warnings.push({ code: 'grouped', section, sales, altas: altas.length });
    // Renta WEB adds up the result of each alta (of each transaction for shares).
    const lines = altas.flatMap((a) => a.transactions ?? [a]);
    windows.push({
      section,
      def: WINDOWS[section],
      altas,
      totals: {
        gains: round2(lines.reduce((s, a) => s + a.gain, 0)),
        losses: round2(lines.reduce((s, a) => s + a.counted, 0)),
      },
    });
  }
  if (windows.some((w) => w.altas.some((a) => a.fiscalData))) warnings.push({ code: 'fiscalData' });
  if (windows.some((w) => w.section === 'shares')) warnings.push({ code: 'carteraValores' });
  if (windows.some((w) => w.section === 'etf')) warnings.push({ code: 'etfOwn' });
  const c = ledger.imported.capital;
  // The totals of every window (also at 0: Renta WEB shows them), the income only when there is.
  const income = [
    {
      box: '0027',
      label: 'Intereses de cuentas, depósitos y activos financieros',
      amount: c.interest,
    },
    {
      box: '0029',
      label: 'Dividendos y demás rendimientos por la participación en fondos propios',
      amount: c.dividends,
    },
    {
      box: '0031',
      label:
        'Rendimientos de la transmisión, amortización o reembolso de otros activos financieros',
      amount: c.assets,
    },
    {
      box: '0037',
      label: 'Gastos de administración y depósito de valores negociables',
      amount: c.expenses,
    },
    {
      box: '0597',
      label: 'Retenciones por rendimientos del capital mobiliario',
      amount: ledger.imported.withheld.capital,
    },
    {
      box: '0603',
      label: 'Retenciones por ganancias patrimoniales',
      amount: ledger.imported.withheld.gains,
    },
    {
      box: '0588',
      label: 'Deducción por doble imposición internacional (impuesto pagado en el extranjero)',
      amount: round2(ledger.imported.foreignTax.reduce((s, f) => s + f.tax, 0)),
    },
  ].filter((t) => t.amount !== 0);
  const totals = [
    ...windows.flatMap((w) => [
      { box: w.def.totals.gains, label: `Ganancias · ${w.def.title}`, amount: w.totals.gains },
      { box: w.def.totals.losses, label: `Pérdidas · ${w.def.title}`, amount: w.totals.losses },
    ]),
    ...income,
  ];
  return { year: ledger.year, windows, totals, warnings, altaOfSale, altaOfDirect };
}

export type { Counterpart };
