import { fireEvent, screen } from '@testing-library/react';
import {
  LETRA_TERMS,
  cuentaDirectaFee,
  effectiveYearly,
  letraPrice,
  letraRate,
  letraReturn,
} from '@modules/invest/domain/treasury';
import { InvestCalc } from '@modules/invest/ui/calculators/Calculators';
import { renderWithI18n, tr } from '@test-utils/render';

describe('Treasury bill maths', () => {
  it('prices a bill like the Treasury: simple interest, ACTUAL/360', () => {
    // BOE 30 July 2026 (BOE-A-2026-16644): 84 days at 2.366 % → 99.451; 266 days at 2.623 % → 98.099.
    expect(letraPrice(2.366, 84)).toBeCloseTo(99.451, 3);
    expect(letraPrice(2.623, 266)).toBeCloseTo(98.099, 3);
    expect(letraPrice(3, 364)).toBe(97.056);
    expect(letraRate(97.056, 364)).toBe(3);
    expect(letraRate(99.451, 84)).toBeCloseTo(2.366, 2);
  });

  it('compounds beyond a year and copes with odd inputs', () => {
    expect(letraPrice(3, 400)).toBeCloseTo(96.769, 3);
    expect(letraRate(97, 400)).toBeCloseTo(2.779, 3);
    expect(letraPrice(Number.NaN, 0)).toBe(100);
    expect(letraRate(0, 364)).toBe(0);
    expect(effectiveYearly(0, 100, 364)).toBe(0);
    expect(effectiveYearly(97.056, 100, 364)).toBe(3.04);
  });

  it('charges the Bank of Spain fee within its floor and ceiling', () => {
    expect(cuentaDirectaFee(10000)).toBe(15);
    expect(cuentaDirectaFee(300)).toBe(0.9);
    expect(cuentaDirectaFee(1_000_000)).toBe(200);
    expect(cuentaDirectaFee(0)).toBe(0);
  });

  it('works out the return held to maturity, after fees and savings tax', () => {
    const r = letraReturn({ price: 97.056, nominal: 10000, days: 364 });
    expect(r).toMatchObject({
      valid: true,
      notMultiple: false,
      paid: 9705.6,
      received: 10000,
      fees: 15,
      grossGain: 294.4,
      ratePct: 3,
      grossTaePct: 3.04,
      tax: 53.09,
      netGain: 226.31,
      netTaePct: 2.34,
    });
    // Own fees, a higher savings bracket and a nominal that is not a multiple of 1,000 €.
    const other = letraReturn({
      price: 98,
      nominal: 1500,
      days: 182,
      fees: 0,
      otherSavingsIncome: 60000,
    });
    expect(other).toMatchObject({ notMultiple: true, fees: 0, grossGain: 30, tax: 6.9 });
    expect(letraReturn({ price: 0, nominal: 1000, days: 91 }).valid).toBe(false);
    expect(letraReturn({ price: 99, nominal: 500, days: 91 }).valid).toBe(false);
    expect(letraReturn({ price: 300, nominal: 1000, days: 91 }).valid).toBe(false);
    expect(LETRA_TERMS.map((x) => x.months)).toEqual([3, 6, 9, 12]);
  });
});

describe('Treasury bill calculator', () => {
  const label = (k: string) => tr(`app.invest.calc.letra.${k}`);
  const set = (k: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label(k)), { target: { value } });

  it('starts from an example rate and shows the gross and net return', () => {
    const { container } = renderWithI18n(<InvestCalc id="letra" />);
    expect(screen.getByRole('region', { name: label('title') })).toBeInTheDocument();
    expect(container).toHaveTextContent('9.705,60 €');
    expect(container).toHaveTextContent('294,40 €');
    expect(container).toHaveTextContent('53,09 €');
    expect(container).toHaveTextContent('226,31 €');
    expect(container).toHaveTextContent('3,000 %');
    expect(screen.getByLabelText(label('term'))).toHaveValue('364');
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('changes the term, the price and the fees', () => {
    const { container } = renderWithI18n(<InvestCalc id="letra" />);
    fireEvent.change(screen.getByLabelText(label('term')), { target: { value: '182' } });
    expect(screen.getByLabelText(label('days'))).toHaveValue('182');
    set('days', '200');
    expect(screen.getByLabelText(label('term'))).toHaveValue('');
    set('price', '101');
    set('fees', '0');
    expect(container).toHaveTextContent('-100,00 €');
    expect(container.querySelector('.inv-stat--bad')).toBeInTheDocument();
  });

  it('warns about a nominal that is not a multiple of 1,000 € and refuses one below it', () => {
    renderWithI18n(<InvestCalc id="letra" />);
    set('nominal', '1500');
    expect(screen.getByText(label('notMultiple'))).toBeInTheDocument();
    set('nominal', '500');
    expect(screen.getByRole('alert')).toHaveTextContent(label('invalid'));
  });
});
