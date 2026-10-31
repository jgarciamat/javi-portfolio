import {
  assetFormResult,
  debtProgress,
  emptyAssetForm,
  emptyPayment,
  groupOf,
  kindOf,
  nextMonths,
  paymentResult,
  paymentWarnings,
  type AssetForm,
} from '@modules/finances/domain/assetForm';
import * as f from '@test-utils/fixtures';

const debtForm = (over: Partial<AssetForm> = {}): AssetForm => ({
  ...emptyAssetForm(),
  group: 'debt',
  name: ' Hipoteca ',
  value: '90000',
  ...over,
});

describe('the form of an investment, good or debt', () => {
  it('maps the kinds to the three groups and back', () => {
    expect(groupOf('investment')).toBe('investment');
    expect(groupOf('debt')).toBe('debt');
    expect(['property', 'vehicle', 'other'].map((k) => groupOf(k as 'other'))).toEqual([
      'good',
      'good',
      'good',
    ]);
    expect(kindOf({ ...emptyAssetForm(), group: 'good', goodKind: 'vehicle' })).toBe('vehicle');
    expect(kindOf(emptyAssetForm())).toBe('investment');
    expect(kindOf(debtForm())).toBe('debt');
  });

  it('sends a good or an investment as before: name, kind and value', () => {
    expect(
      assetFormResult({ ...emptyAssetForm(), group: 'good', name: 'Coche', value: '9000,5' })
    ).toEqual({ input: { name: 'Coche', kind: 'property', value: 9000.5 } });
    // Debt data typed before switching to an investment is left out.
    expect(
      assetFormResult({ ...debtForm({ rate: '3', pays: true }), group: 'investment' })
    ).toEqual({ input: { name: 'Hipoteca', kind: 'investment', value: 90000 } });
  });

  it('says what is wrong first', () => {
    expect(assetFormResult({ ...debtForm(), name: '  ' })).toEqual({
      error: 'app.assets.error.name',
    });
    expect(assetFormResult(debtForm({ value: '' }))).toEqual({ error: 'app.assets.error.value' });
    expect(assetFormResult(debtForm({ value: '-1' }))).toEqual({ error: 'app.assets.error.value' });
    expect(assetFormResult(debtForm({ initial: 'x' }))).toEqual({
      error: 'app.assets.error.initial',
    });
    expect(assetFormResult(debtForm({ rate: '101' }))).toEqual({ error: 'app.assets.error.rate' });
    expect(assetFormResult(debtForm({ rate: 'abc' }))).toEqual({ error: 'app.assets.error.rate' });
    expect(assetFormResult(debtForm({ pays: true }))).toEqual({
      error: 'app.assets.error.payment',
    });
  });

  it('sends a debt with its type, optional data and monthly payment', () => {
    expect(assetFormResult(debtForm())).toEqual({
      input: { name: 'Hipoteca', kind: 'debt', value: 90000, debtType: 'mortgage' },
    });
    expect(
      assetFormResult(
        debtForm({
          debtType: 'car',
          initial: '120000',
          rate: '2,5',
          pays: true,
          payment: {
            amount: '650,4',
            day: '5',
            accountId: 'a2',
            start: '2026-05',
            instalments: '240',
          },
        })
      )
    ).toEqual({
      input: {
        name: 'Hipoteca',
        kind: 'debt',
        value: 90000,
        debtType: 'car',
        initialValue: 120000,
        interestRate: 2.5,
        payment: {
          amount: 650.4,
          day: 5,
          accountId: 'a2',
          startYear: 2026,
          startMonth: 5,
          instalments: 240,
        },
      },
    });
  });
});

describe('the monthly payment', () => {
  const pay = (over = {}) => ({ ...emptyPayment(), amount: '100', day: '20', ...over });

  it('checks the amount, the day and the instalments', () => {
    expect(paymentResult(pay({ amount: '0' }))).toEqual({ error: 'app.assets.error.payment' });
    for (const day of ['', '0', '32', '1,5', 'x']) {
      expect(paymentResult(pay({ day }))).toEqual({ error: 'app.assets.error.day' });
    }
    for (const instalments of ['0', '601', '2.5']) {
      expect(paymentResult(pay({ instalments }))).toEqual({
        error: 'app.assets.error.instalments',
      });
    }
  });

  it('uses the default account and the next payment unless told otherwise', () => {
    expect(paymentResult(pay())).toEqual({
      payment: { amount: 100, day: 20, accountId: null, instalments: null },
    });
    expect(paymentResult(pay({ day: '31', instalments: '600' }))).toEqual({
      payment: { amount: 100, day: 31, accountId: null, instalments: 600 },
    });
  });

  it('editing it, empty instalments keep the ones it had', () => {
    expect(paymentResult(pay(), true)).toEqual({
      payment: { amount: 100, day: 20, accountId: null },
    });
    expect(paymentResult(pay({ instalments: '12' }), true)).toEqual({
      payment: { amount: 100, day: 20, accountId: null, instalments: 12 },
    });
  });

  it('warns, without refusing, when it pays off at once or does not cover the interest', () => {
    expect(paymentWarnings(1000, null, 300)).toEqual([]);
    expect(paymentWarnings(1000, null, 1500)).toEqual(['app.assets.warn.payoffAtOnce']);
    expect(paymentWarnings(100000, 12, 1000)).toEqual(['app.assets.warn.interest']);
    expect(paymentWarnings(100000, 12, 1001)).toEqual([]);
    expect(paymentWarnings(0, 12, 10)).toEqual([]);
    expect(paymentWarnings(1000, 12, NaN)).toEqual([]);
  });
});

describe('debt progress and months', () => {
  it('is the share of what was borrowed already paid', () => {
    expect(debtProgress(f.asset({ kind: 'debt', value: 750, initialValue: 1000 }))).toBe(0.25);
    expect(debtProgress(f.asset({ kind: 'debt', value: 1500, initialValue: 1000 }))).toBe(0);
    expect(debtProgress(f.asset({ kind: 'debt', value: 0, initialValue: 1000 }))).toBe(1);
    expect(debtProgress(f.asset({ kind: 'debt', value: 10, initialValue: 0 }))).toBeNull();
    expect(debtProgress(f.asset({ kind: 'debt', value: 10 }))).toBeNull();
  });

  it('offers the next twelve months for the first payment', () => {
    const months = nextMonths(new Date(2026, 10, 30));
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ value: '2026-11', year: 2026, month: 11 });
    expect(months[2]).toEqual({ value: '2027-01', year: 2027, month: 1 });
  });
});
