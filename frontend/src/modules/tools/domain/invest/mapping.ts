import { readWith, type Field, type FormatSpec, type TypeRule } from './read';
import { norm, type Cell, type DateOrder, type NumberLocale } from './text';
import type { AssetClass, InvestOp } from './types';

/**
 * Any other file: the person says which column is the date, the asset, the units, the amount, the
 * fee... ("¿qué columna es la fecha?"). The answer is remembered for files with the same header.
 */

/** The fields the guided mapping asks for, in the order it asks. */
export const MAPPED_FIELDS: Field[] = [
  'date',
  'type',
  'asset',
  'isin',
  'units',
  'price',
  'amount',
  'currency',
  'fee',
  'toAsset',
  'toUnits',
  'withholding',
];

export interface Mapping {
  /** Column index of each field (the header names are what is remembered). */
  columns: Partial<Record<Field, number>>;
  assetClass: AssetClass;
  locale: NumberLocale;
  order: DateOrder;
  platform: string;
}

/** Words of buy, sell, dividend... in Spanish, English, German, French, Italian and Portuguese. */
export const GENERIC_TYPES: TypeRule[] = [
  [/traspaso.*(entrada|recibid)/, 'switchIn'],
  [/traspaso.*(salida|emitid)/, 'switchOut'],
  [/staking|stake/, 'reward', 'staking'],
  [/airdrop/, 'reward', 'airdrop'],
  [/cashback/, 'reward', 'cashback'],
  [/dividend|dividendo|dividende|distribu|ausschuttung/, 'dividend'],
  [/interest|interes|zins|interet|juros/, 'interest'],
  [/custod|depotgebuhr/, 'custody'],
  [/swap|convert|exchange|intercambio|permuta|tausch/, 'swap'],
  [/buy|compra|kauf|achat|acquisto|suscrip|subscri/, 'buy'],
  [/sell|venta|verkauf|vente|vendita|reembolso|redemption/, 'sell'],
  [/receive|recib|deposit|ingreso|einzahlung|incoming/, 'transferIn'],
  [/send|envi|withdraw|retirada|auszahlung|outgoing/, 'transferOut'],
];

/** The guessed column of each field from the header names (the person confirms or changes it). */
export function guessMapping(header: string[]): Partial<Record<Field, number>> {
  const names = header.map(norm);
  const words: Partial<Record<Field, RegExp>> = {
    date: /fecha|dia|date|datum|time|data/,
    type: /tipo|type|operaci|action|accion|side|movimiento|concepto/,
    asset: /activo|asset|symbol|simbolo|ticker|moneda|coin|token|valor|producto|fondo|name|nombre/,
    isin: /isin/,
    units: /cantidad|quantity|units|unidades|participaciones|shares|titulos|amount asset|volume/,
    price: /precio|price|cotiz|kurs|valor liquidativo|rate/,
    amount: /importe|total|amount|valor|value|efectivo|betrag|subtotal/,
    currency: /divisa|currency|moneda|ccy|wahrung/,
    fee: /comision|fee|gastos|commission|gebuhr/,
    withholding: /retencion|withholding|tax|impuesto/,
  };
  const used = new Set<number>();
  const out: Partial<Record<Field, number>> = {};
  for (const field of MAPPED_FIELDS) {
    const re = words[field];
    const i = re ? names.findIndex((n, j) => !used.has(j) && re.test(n)) : -1;
    if (i >= 0) {
      out[field] = i;
      used.add(i);
    }
  }
  return out;
}

/** The format the person's answers make. */
export function mappedSpec(header: string[], mapping: Mapping): FormatSpec {
  const names = header.map(norm);
  const columns: FormatSpec['columns'] = {};
  for (const [field, i] of Object.entries(mapping.columns) as [Field, number][])
    if (names[i]) columns[field] = [names[i]];
  return {
    id: 'mapped',
    platform: mapping.platform || 'Archivo propio',
    file: 'Columnas indicadas por ti',
    category: mapping.assetClass === 'crypto' ? 'crypto' : 'broker',
    docs: '',
    confirmed: null,
    signature: names.filter(Boolean),
    locale: mapping.locale,
    order: mapping.order,
    columns,
    types: GENERIC_TYPES,
    defaultClass: mapping.assetClass,
    shape: 'rows',
  };
}

/** Reads a table with the person's answers. */
export function readMapped(
  rows: Cell[][],
  headerRow: number,
  mapping: Mapping,
  source: string
): { ops: InvestOp[]; skipped: number } {
  if (!rows[headerRow]) return { ops: [], skipped: 0 };
  const header = rows[headerRow].map((c) => String(c ?? ''));
  return readWith(mappedSpec(header, mapping), rows, headerRow, source);
}

/** What is remembered for a header: its names in order. */
export const headerKey = (header: string[]) => header.map(norm).join('|');
