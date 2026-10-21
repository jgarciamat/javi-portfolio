import type { CsvTable, CsvValue } from '../../application/hooks/useExportCSV';
import type { BookKind } from '../../domain/invoiceBook';
import type { ImportedInvoice, Quarter } from '../../domain/invoiceLedger';
import { retentionOf } from '../../domain/withholdings';
import { quarterLabel } from './InvoicePdfRow';

const QUARTERS: Quarter[] = [1, 2, 3, 4];
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A book of invoices as a table (the VAT book of the year): the invoices by date, then the
 * totals of each quarter and of the year. Invoices left out of the draft are listed but not added.
 */
export function invoiceBookTable(
  book: BookKind,
  invoices: ImportedInvoice[],
  t: (key: string) => string,
  currency: string
): CsvTable {
  const received = book === 'received';
  const label = (key: string) => t(`app.autonomo.review.col.${key}`);
  const unit = (key: string) => `${label(key)} (${currency})`;
  const held = (i: ImportedInvoice) => (received ? retentionOf(i) : i.withheld);
  const sorted = [...invoices].sort((a, b) => a.date.localeCompare(b.date));
  const included = sorted.filter((i) => !i.excluded);
  const sum = (list: ImportedInvoice[], value: (i: ImportedInvoice) => number) =>
    round2(list.reduce((s, i) => s + value(i), 0));
  const totals = (name: string, list: ImportedInvoice[]): CsvValue[] => [
    name,
    '',
    '',
    '',
    sum(list, (i) => i.base),
    '',
    sum(list, (i) => i.vat),
    sum(list, (i) => i.total),
    sum(list, held),
    '',
  ];
  return {
    head: [
      label('date'),
      label('quarter'),
      t('app.autonomo.export.nif'),
      label(received ? 'supplier' : 'client'),
      unit('base'),
      `${label('rate')} (%)`,
      unit('vat'),
      unit('total'),
      unit(received ? 'retention' : 'withheld'),
      label('include'),
    ],
    rows: [
      ...sorted.map((i) => [
        i.date,
        quarterLabel(i),
        i.nif,
        i.concept,
        i.base,
        i.vatRate,
        i.vat,
        i.total,
        held(i),
        t(i.excluded ? 'app.export.csv.no' : 'app.export.csv.yes'),
      ]),
      [],
      ...QUARTERS.map((q) =>
        totals(
          `${t('app.export.csv.total')} T${q}`,
          included.filter((i) => i.quarter === q)
        )
      ),
      totals(t('app.export.csv.total'), included),
    ],
  };
}
