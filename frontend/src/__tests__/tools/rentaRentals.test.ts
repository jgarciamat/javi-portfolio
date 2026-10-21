import {
  addProperty,
  emptyForm,
  propertiesOf,
  removeProperty,
  rentalOf,
  setProperty,
  toInput,
  unrentedOf,
} from '@modules/tools/domain/rentaForm';
import { computeRenta, rentalNet } from '@modules/tools/domain/rentaCalc';
import {
  emptyProperty,
  fromLegacy,
  propertyResult,
  reductionMissing,
  reductionOf,
  type PropertyForm,
} from '@modules/tools/domain/rentaRentals';
import { parseDecimal } from '@shared/utils/numbers';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { loadCcaa } from '@modules/tools/data/renta';

const RATES = { standard: 2, revised: 1.1 };
const prop = (patch: Partial<PropertyForm>): PropertyForm => ({ ...emptyProperty(1), ...patch });
const run = (p: PropertyForm) => propertyResult(p, rentaProperty, 365, parseDecimal, RATES);

// Hand calculations: LIRPF arts. 23, 24 and 85; AEAT Manual práctico de Renta 2025, c04
// (depreciation of the greater of cost and cadastral value without the land, by the days let).
const flat = prop({
  label: 'Piso centro',
  income: '12000',
  expenses: {
    'intereses-financiacion': '2000',
    'reparacion-conservacion': '500',
    'tributos-tasas': '400',
    'comunidad-servicios-personales': '600',
    seguros: '200',
  },
  cadastral: '80000',
  cadastralBuilding: '48000',
  cost: '150000',
  contract: 'after',
  tensioned: true,
  rentDrop: true,
});
const shared = prop({
  label: 'Apartamento',
  share: '50',
  rentedDays: '181',
  income: '4000',
  expenses: {
    'intereses-financiacion': '6000',
    'reparacion-conservacion': '1000',
    'tributos-tasas': '500',
  },
  cadastral: '100000',
  cadastralBuilding: '50000',
  cost: '120000',
  contract: 'before',
});

describe('a rented property on its own', () => {
  it('takes the greater of cost and cadastral value without the land, and the 90 % reduction', () => {
    // 150,000 × 48,000/80,000 = 90,000 > 48,000: 3 % = 2,700. Net 12,000 − 2,500 − 1,200 − 2,700 = 5,600.
    expect(run(flat)).toMatchObject({
      income: 12000,
      cappedApplied: 2500,
      otherExpenses: 1200,
      amortizationBase: 90000,
      amortization: 2700,
      net: 5600,
      reductionPercent: 90,
      reduction: 5040,
      reducedNet: 560,
      disposalDays: 0,
      imputedValue: 0,
    });
  });

  it('shares a co-owned property, prorates the yearly expenses by days and imputes the rest', () => {
    // 50 %: income 2,000; interest 6,000 × 50 % × 181/365 + repairs 500 = 1,987.67; IBI 123.97;
    // base max(120,000 × 50 %, 50,000) × 50 % = 30,000, × 3 % × 181/365 = 446.30. Net −557.94: no
    // reduction. 184 days at disposal: 100,000 × 50 % × 184/365 = 25,205.48 at 2 %.
    expect(run(shared)).toMatchObject({
      share: 50,
      income: 2000,
      capped: 1987.67,
      cappedApplied: 1987.67,
      otherExpenses: 123.97,
      amortizationBase: 30000,
      amortization: 446.3,
      net: -557.94,
      reduction: 0,
      reducedNet: -557.94,
      disposalDays: 184,
      imputedValue: 25205.48,
    });
  });

  it('applies earlier years first and carries the rest of interest and repairs for 4 years', () => {
    const r = run(
      prop({
        income: '3000',
        pendingExcess: '500',
        expenses: { 'intereses-financiacion': '2500', 'reparacion-conservacion': '1500' },
        use: 'other',
      })
    );
    expect(r).toMatchObject({
      pendingApplied: 500,
      cappedApplied: 2500,
      excessCarry: 1500,
      net: 0,
    });
  });

  it('never goes below the imputed rent when let to a relative (art. 24)', () => {
    const r = run(
      prop({ income: '300', cadastral: '60000', revised: true, contract: 'after', relative: true })
    );
    // 300 − 50 % = 150, below 60,000 × 1.1 % = 660.
    expect(r).toMatchObject({ net: 300, reduction: 150, relativeMinimum: 660, reducedNet: 660 });
  });

  it('takes 30 % off income of more than two years, and nothing for days or shares out of range', () => {
    const r = run(
      prop({
        income: '10000',
        use: 'business',
        irregular: true,
        share: '150',
        rentedDays: '400',
        otherDays: '-5',
      })
    );
    expect(r).toMatchObject({
      share: 100,
      rentedDays: 365,
      reduction: 0,
      irregularReduction: 3000,
      reducedNet: 7000,
    });
    expect(run(prop({ use: 'business', irregular: true, income: 'x' })).irregularReduction).toBe(0);
  });

  it('prorates the furniture depreciation by the days let (Manual 2025, c04, caso 2)', () => {
    // 10 % of 6,900 € of furniture, let 9 of 12 months: 690 × 9/12 = 517.50.
    const p = propertyResult(
      prop({ rentedDays: '9', otherDays: '0', income: '5850', expenses: { amortizacion: '690' } }),
      rentaProperty,
      12,
      parseDecimal,
      RATES
    );
    expect(p.otherExpenses).toBe(517.5);
    expect(p.net).toBe(5332.5);
  });

  it('keeps the days that do not impute out of the days at disposal', () => {
    expect(run(prop({ rentedDays: '100', otherDays: '65', cadastral: '1000' }))).toMatchObject({
      disposalDays: 200,
      imputedValue: 547.95,
    });
  });
});

describe('the reduction of art. 23.2 from the answers', () => {
  it.each([
    [{ use: 'season' as const, contract: 'after' as const }, null],
    [{ contract: '' as const }, null],
    [{ contract: 'before' as const }, 60],
    [{ contract: 'after' as const, tensioned: true, rentDrop: true }, 90],
    [{ contract: 'after' as const, tensioned: true, young: true }, 70],
    [{ contract: 'after' as const, young: true }, 50],
    [{ contract: 'after' as const, social: true }, 70],
    [{ contract: 'after' as const, rehabilitated: true }, 60],
    [{ contract: 'after' as const }, 50],
  ])('%j gives %p', (patch, percent) => {
    expect(reductionOf(prop(patch))?.percent ?? null).toBe(percent);
  });

  it('only misses the contract date for a home', () => {
    expect(reductionMissing(prop({}))).toBe(true);
    expect(reductionMissing(prop({ use: 'tourist' }))).toBe(false);
    expect(reductionMissing(prop({ contract: 'before' }))).toBe(false);
  });
});

describe('the rental of the form', () => {
  const base = { ...emptyForm(''), rentalOn: true };

  it('turns the single rental of before into one property with its reduction', () => {
    const legacy = {
      rentalIncome: '9000',
      rentalExpenses: { seguros: '100' },
      construction: '75000',
      rentalReduction: 'general-50',
    };
    expect(fromLegacy(legacy)).toMatchObject({
      income: '9000',
      cost: '75000',
      use: 'home',
      contract: 'after',
    });
    expect(fromLegacy({ ...legacy, rentalReduction: '' })).toMatchObject({
      use: 'home',
      contract: '',
    });
    expect(fromLegacy({ ...legacy, rentalPendingExcess: '7' }).pendingExcess).toBe('7');
  });

  it('starts a new property when nothing was typed, and none when there is no rental', () => {
    expect(propertiesOf(base)).toEqual([emptyProperty(1)]);
    expect(propertiesOf({ ...base, rentalOn: false, properties: [flat] })).toEqual([]);
    expect(propertiesOf({ ...base, rentalExpenses: { seguros: '1' } })[0].expenses).toEqual({
      seguros: '1',
    });
    expect(propertiesOf({ ...base, rentalExpenses: { seguros: ' ' } })).toEqual([emptyProperty(1)]);
    expect(propertiesOf({ ...base, construction: '5' })[0].cost).toBe('5');
  });

  it('adds the properties up, each with its own reduction, and imputes the days at disposal', async () => {
    const form = { ...base, properties: [flat, { ...shared, withheld: '120' }], withheld: '1000' };
    const rental = rentalOf(form, rentaProperty);
    // 560 + (−557.94) = 2.06: the loss of one does not take the other's reduction away.
    expect(rentalNet(rental)).toBe(2.06);
    expect(rental).toMatchObject({ income: 14000, amortization: 3146.3, excessCarry: 0 });
    expect(unrentedOf(form, 2025, rental)).toEqual({ standard: 25205.48, revised: 0 });
    const input = toInput(form, {
      state: rentaState,
      ccaa: await loadCcaa('madrid'),
      extras: rentaWorkExtras,
      property: rentaProperty,
      workReduction: workReductionOf(rentaState),
    });
    expect(input.withheld).toBe(1120);
    const result = computeRenta(input);
    expect(result.rentalNet).toBe(2.06);
    expect(result.imputedIncome).toBe(504.11);
  });

  it('adds, changes and removes properties: with none left there is no rental', () => {
    expect(addProperty({ ...base, rentalOn: false })).toEqual({
      rentalOn: true,
      properties: [emptyProperty(1)],
    });
    const one = { ...base, ...addProperty(base) };
    expect(one.properties).toEqual([emptyProperty(1), emptyProperty(2)]);
    const changed = { ...one, ...setProperty(one, 1, { income: '5' }) };
    expect(changed.properties?.[1].income).toBe('5');
    expect(removeProperty(changed, 0)).toEqual({
      properties: [changed.properties?.[1]],
      rentalOn: true,
    });
    expect(removeProperty({ ...base, properties: [flat] }, 0)).toEqual({
      properties: [],
      rentalOn: false,
    });
  });
});
