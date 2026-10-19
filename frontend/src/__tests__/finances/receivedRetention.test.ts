import {
  detectBooks,
  parseInvoiceBook,
  type BookEntry,
} from '@modules/finances/domain/invoiceBook';
import { toInvoices, updateInvoices } from '@modules/finances/domain/invoiceLedger';

const HEAD = [
  'Fecha',
  'Proveedor',
  'NIF proveedor',
  'Base imponible',
  'Tipo IVA',
  'Tipo retención',
  'Importe retenido',
];

describe('The withholding of a received invoice', () => {
  it('is read into `retention`, from its amount or its rate, with the tax id of the supplier', () => {
    const parsed = parseInvoiceBook(
      [
        HEAD,
        ['2026-04-05', 'Inmuebles Ribera SL', 'b-00.000.000', 400, 21, 19, 76],
        ['2026-04-10', 'Gestoría Pérez', '', 150, 21, 0.15, null],
        ['2026-05-10', 'Gestoría Pérez', '', -100, 21, 15, null],
        ['2026-05-12', 'Papelería Centro', '', 90, 21, null, null],
      ],
      'received',
      2026
    );
    expect(
      parsed.ok && parsed.result.entries.map((e) => [e.concept, e.withheld, e.retention, e.nif])
    ).toEqual([
      ['Inmuebles Ribera SL', 0, 76, 'B00000000'],
      ['Gestoría Pérez', 0, 22.5, undefined],
      // A credit note takes its withholding back.
      ['Gestoría Pérez', 0, -15, undefined],
      ['Papelería Centro', 0, 0, undefined],
    ]);
  });

  it('is not there when the book has no withholding column, and issued invoices keep theirs', () => {
    const received = parseInvoiceBook(
      [
        ['Fecha', 'Proveedor', 'Base imponible', 'Tipo IVA'],
        ['2026-04-05', 'Papelería', 90, 21],
      ],
      'received',
      2026
    );
    expect(received.ok && 'retention' in received.result.entries[0]).toBe(false);
    const issued = parseInvoiceBook(
      [
        ['Fecha', 'Cliente', 'NIF cliente', 'Base imponible', 'Tipo IVA', 'Importe retenido'],
        ['2026-04-05', 'Estudio Norte SL', 'B00000000', 1000, 21, 150],
      ],
      'issued',
      2026
    );
    const entry = issued.ok ? issued.result.entries[0] : ({} as BookEntry);
    expect([entry.concept, entry.withheld, entry.retention, entry.nif]).toEqual([
      'Estudio Norte SL',
      150,
      undefined,
      undefined,
    ]);
  });

  it('does not make a received book with withholdings look like an issued one', () => {
    const sheet = { name: 'Hoja1', rows: [HEAD, ['2026-04-05', 'Local', '', 400, 21, 19, 76]] };
    expect(Object.keys(detectBooks([sheet], 'libro.xlsx').books)).toEqual(['received']);
    const issued = { name: 'Hoja1', rows: [['Fecha', 'Base imponible', 'IRPF']] };
    expect(Object.keys(detectBooks([issued], 'libro.xlsx').books)).toEqual(['issued']);
  });

  it('keeps what the person corrected when the book is imported again', () => {
    const entry: BookEntry = {
      date: '2026-04-10',
      quarter: 2,
      base: 150,
      vatRate: 21,
      vat: 31.5,
      total: 181.5,
      withheld: 0,
      retention: 22.5,
      concept: 'Gestoría Pérez',
    };
    const [first] = toInvoices('received', [entry], {}, []);
    const { list, quarters } = updateInvoices([first], [first.id], {
      retentionFix: 10.5,
      withholding: 'professional',
    });
    expect(quarters).toEqual({ received: [2] });
    const [again] = toInvoices('received', [{ ...entry, retention: 30 }], {}, list);
    expect(again).toMatchObject({ retention: 30, retentionFix: 10.5, withholding: 'professional' });
    // Nothing corrected, nothing kept.
    const [plain] = toInvoices('received', [entry], {}, [first]);
    expect('retentionFix' in plain || 'withholding' in plain).toBe(false);
  });
});
