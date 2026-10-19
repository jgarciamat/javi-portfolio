import { round2 } from '../round';
import type { TableReading } from './detect';
import type { LedgerResult } from './ledger';
import type { CertificateLine } from './pdfReports';

/**
 * What `npm run validar-archivo -- <file>` prints: only the structure and the totals of a file read
 * with the same importer as the app. No names, ids, addresses nor rows: the owner can try a real
 * export on their own computer without anything leaving it or ending up in the repository.
 */
export interface ValidationReport {
  tables: {
    n: number;
    format: string | null;
    confirmed: boolean;
    operations: number;
    skipped: number;
    info: boolean;
    /** Column names of a table no format recognised (headers, never cells). */
    columns: string[];
  }[];
  operations: number;
  byKind: Record<string, number>;
  byClass: Record<string, number>;
  /** Result of each year, by part of the modelo (sales) and closed positions. */
  years: { year: number; sections: Record<string, number>; direct: number; total: number }[];
  /** How many of each warning (the code only). */
  warnings: Record<string, number>;
  certificate: Record<string, number>;
}

const count = (keys: string[]) =>
  keys.reduce<Record<string, number>>((out, key) => ({ ...out, [key]: (out[key] ?? 0) + 1 }), {});

export function validationReport(
  readings: TableReading[],
  ledger: LedgerResult,
  certificate: CertificateLine[] = []
): ValidationReport {
  const years = new Map<number, { sections: Record<string, number>; direct: number }>();
  const yearOf = (date: string) => {
    const y = Number(date.slice(0, 4));
    const entry = years.get(y) ?? { sections: {}, direct: 0 };
    years.set(y, entry);
    return entry;
  };
  for (const s of ledger.history) {
    const e = yearOf(s.date);
    e.sections[s.section] = round2((e.sections[s.section] ?? 0) + s.gain + s.deferred);
  }
  // The ledger keeps only the closed positions of its year: the others are in its years.
  for (const [y, r] of Object.entries(ledger.years)) {
    const e = yearOf(`${y}-01-01`);
    const sales = Object.values(e.sections).reduce((sum, v) => sum + v, 0);
    e.direct = round2(r.savings + r.general - sales);
  }
  return {
    tables: readings.map((r, i) => ({
      n: i + 1,
      format: r.format ? `${r.format.platform} · ${r.format.file}` : null,
      confirmed: !!r.format?.confirmed,
      operations: r.ops.length,
      skipped: r.skipped,
      info: !!r.info,
      columns: r.format || r.info ? [] : r.header,
    })),
    operations: ledger.ops.length,
    byKind: count(ledger.ops.map((o) => o.kind)),
    byClass: count(ledger.ops.map((o) => o.assetClass)),
    years: [...years.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, e]) => ({
        year,
        ...e,
        total: round2(Object.values(e.sections).reduce((s, v) => s + v, 0) + e.direct),
      })),
    warnings: count(ledger.warnings.map((w) => w.code)),
    certificate: count(certificate.map((c) => c.field)),
  };
}

const money = (n: number) =>
  `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const pairs = (record: Record<string, number>) =>
  Object.entries(record)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ') || '—';

/** The report as lines of text, in Spanish. */
export function reportLines(r: ValidationReport): string[] {
  return [
    'Validación local (no se ha enviado nada; no se muestran nombres, identificadores ni filas)',
    '',
    ...r.tables.map(
      (t) =>
        `Tabla ${t.n}: ${
          t.info
            ? 'hoja informativa, sin operaciones'
            : t.format
            ? `${t.format}${t.confirmed ? '' : ' (columnas por comprobar)'}`
            : `no reconocida; columnas: ${t.columns.join(' | ') || '—'}`
        } · operaciones ${t.operations} · filas no entendidas ${t.skipped}`
    ),
    '',
    `Operaciones: ${r.operations}`,
    `Por tipo: ${pairs(r.byKind)}`,
    `Por clase de activo: ${pairs(r.byClass)}`,
    '',
    'Resultado por año (ventas por apartado y derivados o rendimientos):',
    ...r.years.map(
      (y) =>
        `  ${y.year}: ${money(y.total)} (${
          Object.entries(y.sections)
            .map(([s, v]) => `${s} ${money(v)}`)
            .join(', ') || 'sin ventas'
        }; resto ${money(y.direct)})`
    ),
    '',
    `Avisos: ${pairs(r.warnings)}`,
    `Certificado: ${pairs(r.certificate)}`,
  ];
}
