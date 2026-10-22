import { emptyManual, type ManualForm } from '@modules/finances/ui/components/AutonomoManual';
import { toSaved } from '@modules/finances/ui/components/autonomoSync';
import {
  normalWithholding,
  withWithholding,
  withholdingsOf,
  withholdingsOfForm,
} from '@modules/finances/ui/components/withholdingForm';
import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';

const rent: ImportedInvoice = {
  id: 'r1',
  book: 'received',
  kind: 'rent',
  excluded: false,
  date: '2026-04-05',
  quarter: 2,
  base: 400,
  vatRate: 21,
  vat: 84,
  total: 484,
  withheld: 0,
  retention: 76,
  nif: 'B00000000',
  concept: 'Inmuebles Ribera SL',
};

describe('The withholdings typed in the form', () => {
  it('give the modelos of a quarter, with the employees typed and the invoices imported', () => {
    let form: ManualForm = { ...emptyManual(), invoices: [rent] };
    form = withWithholding(form, 2, {
      staff: {
        people: '2',
        paid: '7500',
        withheld: '750',
        kindPeople: '',
        kindPaid: 'abc',
        kindWithheld: '-5',
      },
    });
    form.quarters[1].income.r21 = '5000';
    const result = withholdingsOfForm(form, 2026, 2);
    expect(result.m111).toMatchObject({ due: 750, staff: { people: 2, withheld: 750 } });
    expect(result.m115).toMatchObject({ due: 76, people: 1, base: 400 });
    expect(result.warnings).toEqual([]);
    // The other quarters stay empty.
    expect(withholdingsOfForm(form, 2026, 1).m111.result).toBe('none');
  });

  it('read older data without them, or with parts missing', () => {
    const old = { ...emptyManual(), withholdings: undefined };
    expect(withholdingsOf(old)).toEqual(emptyManual().withholdings);
    expect(normalWithholding({ pros: { people: '1' } as never, filed111: true })).toMatchObject({
      pros: { people: '1', paid: '', withheld: '' },
      filed111: true,
      filed115: false,
    });
  });

  it('travel to the account copy with the withholding of the invoices', () => {
    const form = withWithholding({ ...emptyManual(), invoices: [rent] }, 3, { filed115: true });
    const saved = toSaved(
      { ...form, invoices: [{ ...rent, retentionFix: 70, withholding: 'rent' }] },
      {},
      {}
    );
    expect(saved.manual.invoices[0]).toMatchObject({
      retention: 76,
      nif: 'B00000000',
      retentionFix: 70,
      withholding: 'rent',
    });
    expect(saved.manual.withholdings?.[2].filed115).toBe(true);
    const plain = toSaved(
      { ...emptyManual(), invoices: [{ ...rent, retention: undefined, nif: undefined }] },
      {},
      {}
    );
    expect(Object.keys(plain.manual.invoices[0])).not.toContain('retention');
    expect(Object.keys(plain.manual.invoices[0])).not.toContain('collections');
    // The collections of a cash-accounting invoice (the 347) and a complementaria of the 115.
    const cash = toSaved(
      withWithholding(
        {
          ...emptyManual(),
          invoices: [{ ...rent, cash: true, collections: [{ date: '2026-06-01', amount: 484 }] }],
        },
        2,
        { complement115: { result: '50', receipt: '1150000000001' } }
      ),
      {},
      {}
    );
    expect(cash.manual.invoices[0].collections).toEqual([{ date: '2026-06-01', amount: 484 }]);
    // What was pending of the cash invoices of the year before (the 347), as typed.
    const row = {
      year: 2026,
      key: 'B' as const,
      name: 'Cliente',
      nif: 'B00000000',
      amount: '1500',
    };
    expect(toSaved({ ...emptyManual(), carried347: [row] }, {}, {}).manual.carried347).toEqual([
      row,
    ]);
    expect(toSaved({ ...emptyManual(), carried347: [] }, {}, {}).manual).not.toHaveProperty(
      'carried347'
    );
    expect(cash.manual.withholdings?.[1].complement115).toEqual({
      result: '50',
      receipt: '1150000000001',
    });
  });
});
