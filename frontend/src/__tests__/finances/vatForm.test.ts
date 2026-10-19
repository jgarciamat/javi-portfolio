import {
  NO_VAT_EXTRAS,
  emptyIntra,
  emptyVat,
  isEmptyVat,
  toQuarterVat,
  toVatOptions,
  vatExtrasOf,
  vatOfForm,
  type VatForm,
} from '@modules/finances/ui/components/vatForm';

/** The VAT of a quarter and of the year as typed, into what the server takes. Invented figures. */
const typed = (over: Partial<VatForm>): VatForm => ({ ...emptyVat(), ...over });

describe('The VAT of a quarter as typed', () => {
  it('fills in what older data lacks, and an empty one is none', () => {
    expect(vatOfForm(undefined)).toEqual(emptyVat());
    expect(vatOfForm({ sales: { ...emptyVat().sales, exports: '5' } }).sales.exports).toBe('5');
    expect(vatOfForm({ intra: [{ key: 'S' } as never] }).intra).toEqual([emptyIntra('S')]);
    expect(isEmptyVat(null)).toBe(true);
    expect(isEmptyVat({ oneOff: { ...emptyVat().oneOff, art80: '1' } })).toBe(false);
    expect(toQuarterVat(emptyVat())).toBeNull();
  });

  it('gives the server every amount, the corrections with their sign', () => {
    const v = typed({
      sales: { ...emptyVat().sales, intraEU: '1000,50', exports: 'abc', exempt: '-3' },
      re: { r21: '24000', r10: '', r4: '200', tobacco: '1000' },
      salesFix: { base: '-12000', vat: '-2520', priorYear: '-12000' },
      reFix: { base: '-100', fee: '-5,2' },
      deductionFix: { base: '-18000', vat: '-3780' },
      intraFix: { base: '-6000', vat: '-1260' },
      oneOff: { reagp: '12', investmentAdjust: '-8', art80: '30', importDeferred: '50' },
      cash: {
        invoiced: { r21: '1000', r10: '', r4: '' },
        collected: { r21: '400', r10: '', r4: '' },
        purchasesInvoiced: { r21: '', r10: '', r4: '' },
        purchasesPaid: { r21: '', r10: '', r4: '' },
      },
      intra: [
        { ...emptyIntra('E'), vatId: ' FR12345678901 ', name: ' Client ', base: '1000,5' },
        // A correction of an earlier period, and one whose quarter is missing (taken as plain).
        {
          ...emptyIntra('A'),
          vatId: 'NL000000000B01',
          base: '2841,91',
          rect: true,
          rectYear: '2025',
          rectQuarter: '2',
          previous: '6297,16',
        },
        { ...emptyIntra('S'), base: '10', rect: true, rectQuarter: '' },
        // An empty line is dropped.
        emptyIntra('I'),
      ],
    });
    expect(toQuarterVat(v)).toEqual({
      sales: {
        intraEU: 1000.5,
        exports: 0,
        notSubject: 0,
        oss: 0,
        ossSubject: 0,
        reverse: 0,
        exempt: 0,
        exemptOccasional: 0,
        nonVat: 0,
      },
      re: { r21: 24000, r10: 0, r4: 200, tobacco: 1000 },
      salesFix: { base: -12000, vat: -2520, priorYear: -12000 },
      reFix: { base: -100, fee: -5.2 },
      deductionFix: { base: -18000, vat: -3780 },
      intraFix: { base: -6000, vat: -1260 },
      reagp: 12,
      investmentAdjust: -8,
      art80: 30,
      importDeferred: 50,
      cash: {
        invoiced: { r21: 1000, r10: 0, r4: 0 },
        collected: { r21: 400, r10: 0, r4: 0 },
        purchasesInvoiced: { r21: 0, r10: 0, r4: 0 },
        purchasesPaid: { r21: 0, r10: 0, r4: 0 },
      },
      intra: [
        { key: 'E', vatId: 'FR12345678901', name: 'Client', base: 1000.5 },
        {
          key: 'A',
          vatId: 'NL000000000B01',
          name: '',
          base: 2841.91,
          rectifies: { year: 2025, quarter: 2, previous: 6297.16 },
        },
        { key: 'S', vatId: '', name: '', base: 10 },
      ],
    });
  });

  it('leaves out what is zero', () => {
    expect(
      toQuarterVat(typed({ oneOff: { ...emptyVat().oneOff, reagp: '0', art80: '1' } }))
    ).toEqual({ art80: 1 });
  });
});

describe('The VAT of the year as typed', () => {
  it('without anything, only says what was left to offset at the start of the year', () => {
    expect(vatExtrasOf(null)).toEqual(NO_VAT_EXTRAS);
    expect(toVatOptions(undefined, 40, [null, null, null, null])).toEqual({ offsetStart: 40 });
  });

  it('gives the prorrata, the investment goods, the skipped quarters, the refund and the regime', () => {
    expect(
      toVatOptions(
        {
          ...NO_VAT_EXTRAS,
          provisional: '80',
          special: true,
          refund: true,
          skip: [3],
          regime: 'reagp',
          reagpVolume: '64176',
          investments: [
            { year: '2024', vat: '1000', pct: '150', realEstate: false },
            // Without a year or a VAT it is not taken.
            { year: '', vat: '1000', pct: '50', realEstate: true },
          ],
        },
        0,
        [3288, null, 18258, null]
      )
    ).toEqual({
      offsetStart: 0,
      prorrata: { provisional: 80, special: true },
      investments: [{ year: 2024, vat: 1000, pct: 100, realEstate: false }],
      skipOffset: [2],
      refund: true,
      filed: [3288, null, 18258, null],
      reagpVolume: 64176,
      regime: 'reagp',
    });
  });

  it('takes the special prorrata without a percentage, and ignores one out of 0-100', () => {
    expect(toVatOptions({ ...NO_VAT_EXTRAS, special: true }, 0, [])).toEqual({
      offsetStart: 0,
      prorrata: { provisional: null, special: true },
    });
    expect(toVatOptions({ ...NO_VAT_EXTRAS, provisional: '120' }, 0, [])).toEqual({
      offsetStart: 0,
    });
  });
});
