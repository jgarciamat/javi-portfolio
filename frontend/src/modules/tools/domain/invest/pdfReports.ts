import { parseMoney, parseWhen } from './text';
import type { InvestOp } from './types';

/**
 * Reports that come as PDF with selectable text, read line by line (application/readPdf.ts). The
 * text never leaves the device.
 */

// ─── Quantfury: «Informe del historial de trading» ────────────────────────────

const QF_ROW =
  /(\d{2}\/\d{2}\/\d{4})\s+(\d{1,2}:\d{2}:\d{2})\s*(AM|PM)\s*UTC\s+(COMPRAR|VENDER)\s*\((abrir|cerrar|añadir|anadir|reducir)\)/i;
const QF_TOTAL = /^\s*Total\s+(.+)$/i;

/** It is a Quantfury trading history. */
export const isQuantfury = (lines: string[]) =>
  lines.some((l) => /Informe del historial de trading/i.test(l)) &&
  lines.some((l) => /Posiciones Cerradas/i.test(l));

/**
 * Quantfury's closed positions: each position is several rows (open, add, reduce, close) and ends
 * in "Total ±X", its result. The account is leveraged and the positions are not shares or coins
 * owned, so each one is a derivative result (gain or loss of the savings base, LIRPF arts. 46.b and
 * 49 — NO CONFIRMADO), of the year it was closed, in dollars (shares) or USDT (crypto pairs).
 */
export function readQuantfury(lines: string[]): InvestOp[] {
  const ops: InvestOp[] = [];
  let section: 'shares' | 'crypto' = 'shares';
  let rows: { symbol: string; date: string; at: string }[] = [];
  let n = 0;
  for (const line of lines) {
    if (/Pares de criptomonedas/i.test(line)) section = 'crypto';
    else if (/Acciones y ETFs/i.test(line)) section = 'shares';
    const row = QF_ROW.exec(line);
    if (row) {
      const when = parseWhen(`${row[1]} ${row[2]} ${row[3]}`) as NonNullable<
        ReturnType<typeof parseWhen>
      >;
      const symbol = line.slice(0, row.index).trim().split(/\s+/)[0] || rows[0]?.symbol || '?';
      rows.push({ symbol, date: when.date, at: when.at });
      continue;
    }
    const total = QF_TOTAL.exec(line);
    if (!total || rows.length === 0) continue;
    const money = parseMoney(total[1].replace(/\s+/g, ''), 'en');
    const gain = Number.isFinite(money.value) ? money.value : 0;
    const close = rows[rows.length - 1];
    n++;
    ops.push({
      id: `quantfury:${n}`,
      format: 'quantfury',
      account: 'Quantfury',
      date: close.date,
      at: close.at,
      kind: 'realized',
      asset: rows[0].symbol,
      assetClass: 'derivative',
      underlying: section,
      name: rows[0].symbol,
      units: 0,
      amount: Math.max(0, gain),
      cost: Math.max(0, -gain),
      acquired: close.date,
      currency: money.currency ?? (section === 'crypto' ? 'USDT' : 'USD'),
      eur: null,
      fee: 0,
      feeCurrency: null,
      note: `Posición ${section === 'crypto' ? 'de cripto' : 'de acciones'} abierta el ${
        rows[0].date
      }`,
    });
    rows = [];
  }
  return ops;
}

// ─── Fiscal certificates of Spanish entities ──────────────────────────────────

/** The figures a certificate (información fiscal, modelo 189/193/187 data) can give. */
export type CertificateField =
  'interest' | 'dividends' | 'withheld' | 'gains' | 'losses' | 'proceeds' | 'cost' | 'expenses';

export interface CertificateLine {
  field: CertificateField;
  amount: number;
  /** The printed line, for the person to check. */
  line: string;
}

const LABELS: [RegExp, CertificateField][] = [
  [/retenci[oó]n|ingreso a cuenta/i, 'withheld'],
  [/gastos? de (administraci[oó]n|custodia|dep[oó]sito)/i, 'expenses'],
  [/p[eé]rdidas? patrimonial/i, 'losses'],
  [/ganancias? patrimonial/i, 'gains'],
  [/valor de transmisi[oó]n|importe (de la )?transmisi[oó]n|importe (del )?reembolso/i, 'proceeds'],
  [/valor de adquisici[oó]n|coste de adquisici[oó]n/i, 'cost'],
  [/dividendo|participaci[oó]n en (los )?fondos propios/i, 'dividends'],
  [
    /intereses|rendimientos? (del capital|de cuentas|de dep[oó]sitos)|rendimiento [ií]ntegro/i,
    'interest',
  ],
];

const AMOUNT = /-?\d{1,3}(?:\.\d{3})*,\d{2}(?!\d)|-?\d+,\d{2}(?!\d)/g;

/** Is it a fiscal certificate of a Spanish entity? */
export const isCertificate = (lines: string[]) =>
  lines.some((l) =>
    /informaci[oó]n fiscal|certificado (fiscal|de retenciones)|a efectos del (irpf|impuesto sobre la renta)/i.test(
      l
    )
  );

/**
 * The amounts of a fiscal certificate by what its line says (the last amount of the line). Nothing
 * is added on its own: the person checks each line before it goes to the Renta.
 */
export function readCertificate(lines: string[]): CertificateLine[] {
  const out: CertificateLine[] = [];
  for (const line of lines) {
    const label = LABELS.find(([re]) => re.test(line));
    const amounts = line.match(AMOUNT);
    if (!label || !amounts) continue;
    const last = amounts[amounts.length - 1];
    out.push({
      field: label[1],
      amount: Math.abs(parseMoney(last, 'es').value),
      line: line.trim(),
    });
  }
  return out;
}
