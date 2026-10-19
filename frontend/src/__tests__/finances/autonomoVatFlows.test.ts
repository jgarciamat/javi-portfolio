import {
  checkImport,
  irpfDeductible,
  type CheckInput,
} from '@modules/finances/domain/importChecks';
import {
  expensesByQuarter,
  incomeByQuarter,
  isTaxedSale,
  type BookEntry,
  type BookKind,
} from '@modules/finances/domain/invoiceBook';
import {
  toInvoices,
  updateInvoices,
  type ImportedInvoice,
} from '@modules/finances/domain/invoiceLedger';
import {
  entriesOf,
  parseInvoiceTokens,
  type InvoicePdf,
} from '@modules/finances/domain/invoicePdf';
import type { ManualData } from '@modules/finances/domain/types';
import type { PdfToken } from '@modules/finances/domain/taxModelPdf';
import {
  emptyManual,
  toManualData,
  type ManualForm,
} from '@modules/finances/ui/components/AutonomoManual';
import { applyInvoices, applyModel303 } from '@modules/finances/ui/components/importForm';
import { summarize } from '@modules/finances/ui/components/AutonomoSummary';
import { toSaved } from '@modules/finances/ui/components/autonomoSync';
import { NO_VAT_EXTRAS, emptyIntra, emptyVat } from '@modules/finances/ui/components/vatForm';

/** The VAT of the invoices from the book to the form, the checks and the account copy. Invented data. */
const entry = (
  date: string,
  concept: string,
  base: number,
  over: Partial<BookEntry> = {}
): BookEntry => {
  const vatRate = over.vatRate ?? 21;
  const vat = Math.round(base * vatRate) / 100;
  return {
    date,
    quarter: (Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1) as 1 | 2 | 3 | 4,
    base,
    vatRate,
    vat,
    total: Math.round((base + vat) * 100) / 100,
    withheld: 0,
    concept,
    ...over,
  };
};
const book = (kind: BookKind, ...entries: BookEntry[]) => toInvoices(kind, entries, {}, []);

describe('The books by VAT operation', () => {
  it('puts only the sales with Spanish VAT in the income by rate', () => {
    expect(isTaxedSale({})).toBe(true);
    expect(isTaxedSale({ op: 're' })).toBe(true);
    expect(isTaxedSale({ op: 'export' })).toBe(false);
    const income = incomeByQuarter([
      entry('2026-01-10', 'A', 100),
      entry('2026-01-11', 'B', 500, { vatRate: 0, op: 'intraEU' }),
    ]);
    expect(income[1]).toEqual({ r21: 100, r10: 0, r4: 0, r0: 0, withheld: 0 });
  });

  it('adds up expenses by kind, rate and operation; an intra-EU one counts its base', () => {
    const lines = expensesByQuarter(
      [
        entry('2026-01-10', 'Material', 100, { op: 'intraGoods' }),
        entry('2026-01-11', 'Material', 50, { op: 'intraGoods' }),
        entry('2026-01-12', 'Material', 100),
        entry('2026-01-13', 'Material', 4000, { investment: true }),
      ],
      () => 'material'
    );
    expect(lines[1]).toEqual([
      { kind: 'material', amount: 150, vatRate: 21, days: null, op: 'intraGoods' },
      { kind: 'material', amount: 121, vatRate: 21, days: null },
      { kind: 'material', amount: 4840, vatRate: 21, days: null, investment: true },
    ]);
  });

  it('keeps what the person corrected of the VAT of an invoice when the book comes again', () => {
    const first = book('issued', entry('2026-01-10', 'Client', 100, { vatRate: 0 }));
    const fixed = updateInvoices(first, [first[0].id], {
      op: 'intraEU',
      vatId: 'FR00000000001',
      key349: 'S',
      opFix: true,
    }).list;
    const again = toInvoices(
      'issued',
      [entry('2026-01-10', 'Client', 100, { vatRate: 0 })],
      {},
      fixed
    );
    expect(again[0]).toMatchObject({
      op: 'intraEU',
      vatId: 'FR00000000001',
      key349: 'S',
      opFix: true,
    });
    // Without a VAT number or key, only the operation stays.
    const bare = updateInvoices(first, [first[0].id], { op: 'export', opFix: true }).list;
    const third = toInvoices(
      'issued',
      [entry('2026-01-10', 'Client', 100, { vatRate: 0 })],
      {},
      bare
    );
    expect(third[0]).toMatchObject({ op: 'export', opFix: true });
    expect(third[0].vatId).toBeUndefined();
  });
});

describe('The VAT of the books in the form', () => {
  const issued = book(
    'issued',
    entry('2026-02-01', 'Client Fictif', 3000, {
      vatRate: 0,
      op: 'intraEU',
      vatId: 'FR00000000001',
      key349: 'E',
    }),
    entry('2026-02-02', 'Export Inc', 2000, { vatRate: 0, op: 'export' }),
    entry('2026-02-03', 'Tienda', 1000, { op: 're' }),
    entry('2026-02-04', 'Caja', 500, { vatRate: 10, cash: true }),
    entry('2026-02-05', 'Nacional', 4000)
  );
  const received = book(
    'received',
    entry('2026-02-06', 'Lieferant', 1500, { op: 'intraGoods', vatId: 'DE000000001', key349: 'A' }),
    entry('2026-02-07', 'Software', 300, { op: 'intraServices', vatId: 'IE0000000A' }),
    entry('2026-02-08', 'Proveedor', 200, { cash: true }),
    entry('2026-02-09', 'Maquinaria', 4000, { investment: true })
  );

  it('fills the sales without VAT, the surcharge, cash accounting and the 349 of the quarter', () => {
    let form: ManualForm = { ...emptyManual(), invoices: [...issued, ...received] };
    // What the person typed apart stays.
    form = {
      ...form,
      quarters: form.quarters.map((q, i) =>
        i === 0
          ? {
              ...q,
              vat: {
                ...emptyVat(),
                oneOff: { ...emptyVat().oneOff, art80: '7' },
                re: { ...emptyVat().re, tobacco: '10' },
              },
            }
          : q
      ),
    };
    form = applyInvoices(applyInvoices(form, 'issued', [1]), 'received', [1]);
    const v = form.quarters[0].vat!;
    expect(form.quarters[0].income).toEqual({ r21: '5000', r10: '500', r4: '', r0: '' });
    expect(v.sales).toMatchObject({ intraEU: '3000', exports: '2000', notSubject: '' });
    expect(v.re).toEqual({ r21: '1000', r10: '', r4: '', tobacco: '10' });
    expect(v.cash.invoiced).toEqual({ r21: '', r10: '500', r4: '' });
    expect(v.cash.purchasesInvoiced).toEqual({ r21: '200', r10: '', r4: '' });
    expect(v.oneOff.art80).toBe('7');
    expect(v.intra.map((r) => [r.key, r.vatId, r.base])).toEqual([
      ['E', 'FR00000000001', '3000'],
      ['A', 'DE000000001', '1500'],
      ['I', 'IE0000000A', '300'],
    ]);
    expect(form.quarters[0].expenses.map((e) => e.op)).toEqual([
      'intraGoods',
      'intraServices',
      undefined,
    ]);
    // The summary on top counts the sales without VAT as income.
    expect(summarize(form, 1, [], false, 2026).income).toBe(10500);
    // And the server takes them.
    const data = toManualData(form);
    expect(data.quarters[0].vat?.sales?.exports).toBe(2000);
    expect(data.quarters[0].expenses[0]).toMatchObject({ op: 'intraGoods', amount: 1500 });
  });

  it('takes the expenses of a filed 303 by channel, with their operation', () => {
    const { form } = applyModel303(
      emptyManual(),
      {
        model: '303',
        year: 2026,
        quarter: 1,
        boxes: { '32': 1000, '33': 210, '38': 100, '39': 21 },
      },
      1
    );
    expect(form.quarters[0].expenses).toEqual([
      { kind: 'other', amount: '1000', vatRate: 21, days: '', op: 'import' },
      { kind: 'other', amount: '100', vatRate: 21, days: '', op: 'intraGoods', investment: true },
    ]);
  });
});

describe('The VAT checks before the draft', () => {
  const input = (invoices: ImportedInvoice[], over: Partial<CheckInput> = {}): CheckInput => ({
    invoices,
    manual: toManualData(emptyManual()),
    year: 2026,
    today: '2026-03-15',
    from: 1,
    upTo: 1,
    model130: null,
    hardToJustify: false,
    ...over,
  });

  it('flags intra-EU operations without a VAT number, purchases not self-assessed and the rest', () => {
    const list = [
      ...book(
        'issued',
        entry('2026-01-10', 'Sin NIF', 100, { vatRate: 0, op: 'intraEU' }),
        entry('2026-01-11', 'Exenta', 100, { vatRate: 0, op: 'exempt' })
      ),
      ...book(
        'received',
        entry('2026-01-12', 'Lieferant', 100, { vatRate: 0, nif: 'DE000000001' }),
        entry('2026-01-13', 'Ordenador', 900, { investment: true }),
        entry('2026-01-14', 'Lieferant AIB', 100, {
          op: 'intraGoods',
          vatId: 'DE000000001',
          rateGuessed: true,
        }),
        entry('2026-01-15', 'Caja', 100, { cash: true })
      ),
    ];
    const checks = checkImport(input(list));
    const of = (code: string) => checks.find((c) => c.code === code)?.invoices;
    expect(of('intraNoVatId')).toEqual([list[0].id]);
    expect(of('notSelfAssessed')).toEqual([list[2].id]);
    expect(of('investmentSmall')).toEqual([list[3].id]);
    expect(of('rateGuessed')).toEqual([list[4].id]);
    expect(of('cashBook')).toEqual([list[5].id]);
    // An exempt sale says why: it is not flagged.
    expect(of('exemptNoCause')).toBeUndefined();
  });

  it('counts for the 130 what the server counts: the base without VAT, nothing of an investment good', () => {
    const profile = toManualData(emptyManual()).profile;
    expect(
      irpfDeductible({ kind: 'material', amount: 100, vatRate: 21, op: 'intraGoods' }, profile)
    ).toBe(100);
    expect(
      irpfDeductible({ kind: 'material', amount: 1210, vatRate: 21, investment: true }, profile)
    ).toBe(0);
    // A filed 130 against the income of the books counts the sales without VAT too.
    const manual = toManualData(emptyManual());
    const data: ManualData = {
      ...manual,
      quarters: manual.quarters.map((q, i) =>
        i === 0 ? { ...q, income: { ...q.income, r21: 100 }, vat: { sales: { exports: 50 } } } : q
      ) as ManualData['quarters'],
    };
    const checks = checkImport(
      input(book('issued', entry('2026-01-10', 'A', 100)), {
        manual: data,
        model130: { year: 2026, quarter: 1, income: 150, expenses: 0 },
      })
    );
    expect(checks.map((c) => c.code)).not.toContain('model130Income');
  });
});

describe('What an invoice in PDF says it is for VAT', () => {
  const pdf = (over: Partial<InvoicePdf> = {}): InvoicePdf => ({
    date: '2026-02-10',
    number: '1',
    issuer: { name: 'Lieferant GmbH', nif: 'DE000000001' },
    client: { name: 'Yo', nif: '00000001R' },
    taxes: [{ rate: 0, base: 100, vat: 0 }],
    withheld: 0,
    total: 100,
    credit: false,
    concept: 'Piezas',
    review: [],
    mismatch: null,
    ...over,
  });

  it('marks a received intra-EU purchase and self-assesses its VAT at 21 %, to check', () => {
    const [e] = entriesOf(pdf({ vatHint: 'reverse' }), 'received');
    expect(e).toMatchObject({
      op: 'intraGoods',
      vatId: 'DE000000001',
      vatRate: 21,
      rateGuessed: true,
    });
    // A service from the EU, and a reverse charge from outside it.
    expect(
      entriesOf(
        pdf({ vatHint: 'intraEU', issuer: { name: 'Google Ads', nif: 'IE0000000A' } }),
        'received'
      )[0].op
    ).toBe('intraServices');
    expect(
      entriesOf(
        pdf({ vatHint: 'reverse', issuer: { name: 'Contratista', nif: 'B00000001' } }),
        'received'
      )[0]
    ).toMatchObject({
      op: 'reverse',
    });
    // An export or an exempt purchase is a plain purchase for the buyer.
    expect(entriesOf(pdf({ vatHint: 'export' }), 'received')[0].op).toBeUndefined();
    // A rate the reading did not give is self-assessed at 21 % too.
    expect(
      entriesOf(
        pdf({ vatHint: 'reverse', taxes: [{ rate: null, base: 100, vat: 0 }] }),
        'received'
      )[0]
    ).toMatchObject({
      vatRate: 21,
      rateGuessed: true,
    });
    // With a rate on the invoice, it is kept.
    expect(
      entriesOf(
        pdf({ vatHint: 'reverse', taxes: [{ rate: 10, base: 100, vat: 0 }] }),
        'received'
      )[0]
    ).toMatchObject({
      vatRate: 10,
    });
  });

  it('marks an issued one with what it says, with the VAT number of the client', () => {
    const issued = pdf({ vatHint: 'intraEU', client: { name: 'Client', nif: 'FR00000000001' } });
    expect(entriesOf(issued, 'issued')[0]).toMatchObject({ op: 'intraEU', vatId: 'FR00000000001' });
    expect(entriesOf(pdf({ vatHint: null }), 'issued')[0].op).toBeUndefined();
  });

  const line = (text: string, y: number): PdfToken => ({ text, x: 40, y, field: false });
  const invoice = (words: string) =>
    parseInvoiceTokens([
      [
        line('FACTURA', 800),
        line('Fecha: 10/02/2026', 780),
        line('Emisor Ejemplo SL B00000001', 760),
        line(words, 740),
        line('Base imponible 100,00', 720),
        line('IVA 0 % 0,00', 700),
        line('Total 100,00', 680),
      ],
    ]);

  it.each([
    ['Inversión del sujeto pasivo, art. 84 LIVA', 'reverse'],
    ['Entrega intracomunitaria exenta art. 25 LIVA', 'intraEU'],
    ['Exportación exenta', 'export'],
    ['Operación no sujeta, art. 69 LIVA', 'notSubject'],
    ['Exento de IVA, art. 20', 'exempt'],
  ])('reads «%s» as %s and asks to check it', (words, hint) => {
    const parsed = invoice(words);
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.invoice.vatHint).toBe(hint);
    expect(parsed.invoice.review).toContain(hint);
  });
});

describe('The VAT in the account copy', () => {
  it('travels only when there is something, with the operations of the invoices', () => {
    const base = emptyManual();
    const invoices = book(
      'received',
      entry('2026-01-10', 'Lieferant', 100, {
        op: 'intraGoods',
        vatId: 'DE000000001',
        key349: 'A',
        cash: true,
        rateGuessed: true,
        investment: true,
      })
    ).map((i) => ({ ...i, opFix: true }));
    const form: ManualForm = {
      ...base,
      invoices,
      filed303: [null, 672],
      quarters: base.quarters.map((q, i) =>
        i === 0
          ? {
              ...q,
              expenses: [
                {
                  kind: 'material',
                  amount: '100',
                  vatRate: 21,
                  days: '',
                  op: 'import',
                  investment: true,
                  use: 'taxed',
                },
                {
                  kind: 'material',
                  amount: '100',
                  vatRate: 21,
                  days: '',
                  op: 'domestic',
                  use: 'common',
                },
              ],
              vat: { ...emptyVat(), intra: [emptyIntra('E')] },
            }
          : { ...q, vat: emptyVat() }
      ),
    };
    const saved = toSaved(
      form,
      {
        hardToJustify: false,
        exempt: false,
        priorNet: '',
        toOffset: '',
        vat: { ...NO_VAT_EXTRAS, refund: true },
      },
      {}
    );
    expect(saved.manual.invoices[0]).toMatchObject({
      op: 'intraGoods',
      vatId: 'DE000000001',
      key349: 'A',
      cash: true,
      rateGuessed: true,
      investment: true,
      opFix: true,
    });
    expect(saved.manual.quarters[0].expenses).toEqual([
      {
        kind: 'material',
        amount: '100',
        vatRate: 21,
        days: '',
        op: 'import',
        investment: true,
        use: 'taxed',
      },
      { kind: 'material', amount: '100', vatRate: 21, days: '' },
    ]);
    expect(saved.manual.quarters[0].vat?.intra).toHaveLength(1);
    // The server takes no «common» use nor «domestic» operation: they are the default.
    expect(toManualData(form).quarters[0].expenses[1]).toEqual({
      kind: 'material',
      amount: 100,
      vatRate: 21,
      days: 0,
    });
    expect(saved.manual.quarters[1].vat).toBeUndefined();
    expect(saved.manual.filed303).toEqual([null, 672, null, null]);
    expect(saved.extras.vat?.refund).toBe(true);
    // Without any of it, the copy is the one of before.
    const plain = toSaved(
      base,
      { hardToJustify: false, exempt: false, priorNet: '', toOffset: '' },
      {}
    );
    expect(plain.manual).not.toHaveProperty('filed303');
    expect(plain.extras).not.toHaveProperty('vat');
  });
});
