import { fireEvent, screen, within } from '@testing-library/react';
import {
  budgetRule,
  inflationEffect,
  loanPayment,
  monthsToGoal,
  simulateSavings,
  vatBreakdown,
} from '@modules/tools/domain/calculators';
import { TOOL_PAGES } from '@modules/tools/domain/toolPages';
import {
  BudgetRulePage,
  GoalCalculatorPage,
  InflationCalculatorPage,
  LoanCalculatorPage,
  SavingsSimulatorPage,
  VatCalculatorPage,
} from '@modules/tools/ui/CalculatorPages';
import { renderWithProviders, tr } from '@test-utils/render';

describe('budgetRule', () => {
  it('splits an income 50/30/20 and ignores nonsense', () => {
    expect(budgetRule(1800)).toEqual({ needs: 900, wants: 540, saving: 360 });
    expect(budgetRule(1234.57)).toEqual({ needs: 617.29, wants: 370.37, saving: 246.91 });
    expect(budgetRule(-5)).toEqual({ needs: 0, wants: 0, saving: 0 });
    expect(budgetRule(Number.NaN)).toEqual({ needs: 0, wants: 0, saving: 0 });
  });
});

describe('simulateSavings', () => {
  it('adds the deposits and the compound interest year by year', () => {
    const flat = simulateSavings({ initial: 1000, monthly: 100, annualRatePct: 0, years: 2 });
    expect(flat).toEqual({
      finalBalance: 3400,
      contributed: 3400,
      interest: 0,
      yearly: [
        { year: 1, balance: 2200, contributed: 2200 },
        { year: 2, balance: 3400, contributed: 3400 },
      ],
    });
    const grown = simulateSavings({ initial: 1000, monthly: 100, annualRatePct: 12, years: 1 });
    // The initial amount grows exactly 12 % in a year; the deposits grow month by month.
    const m = Math.pow(1.12, 1 / 12) - 1;
    const deposits = (100 * (Math.pow(1 + m, 12) - 1)) / m;
    expect(grown.finalBalance).toBeCloseTo(1120 + deposits, 1);
    expect(grown.interest).toBeCloseTo(grown.finalBalance - 2200, 2);
  });

  it('cleans the input: no negatives, whole years, a cap and no NaN', () => {
    expect(
      simulateSavings({ initial: -1, monthly: -1, annualRatePct: Number.NaN, years: 2.9 })
    ).toMatchObject({
      finalBalance: 0,
      yearly: [{ year: 1 }, { year: 2 }],
    });
    expect(
      simulateSavings({ initial: 1, monthly: 0, annualRatePct: 0, years: 500 }).yearly
    ).toHaveLength(60);
    expect(simulateSavings({ initial: 1, monthly: 0, annualRatePct: 0, years: -3 }).yearly).toEqual(
      []
    );
    // A return below -100 % cannot lose more than everything.
    expect(
      simulateSavings({ initial: 1000, monthly: 0, annualRatePct: -500, years: 1 }).finalBalance
    ).toBe(0);
  });
});

describe('calculator pages', () => {
  const metaDescription = () =>
    document.head.querySelector('meta[name="description"]')?.getAttribute('content');

  it('splits the income and updates while typing, with the page meta', () => {
    const { unmount } = renderWithProviders(<BudgetRulePage />, { authenticated: false });
    expect(document.title).toBe(tr('tools.rule.title'));
    expect(metaDescription()).toBe(tr('tools.rule.description'));
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${window.location.origin}/calculadora-50-30-20`
    );
    const needs = screen
      .getByRole('heading', { name: /50 % · / })
      .closest('section') as HTMLElement;
    expect(within(needs).getByText(/900/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('tools.rule.income')), {
      target: { value: '2000,5' },
    });
    expect(within(needs).getByText(/1\.?000/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('tools.rule.income')), { target: { value: 'abc' } });
    expect(within(needs).getByText(/^0\s?€$/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr('tools.cta.button') })).toHaveAttribute(
      'href',
      '/login?mode=register'
    );
    // The guides on the same topic, the Videoteca and Hacienda paso a paso.
    expect(
      screen.getByRole('link', { name: 'Método 50/30/20: cómo repartir tu sueldo sin complicarte' })
    ).toHaveAttribute('href', '/guias/metodo-50-30-20');
    expect(screen.getByRole('link', { name: tr('videos.title') })).toHaveAttribute(
      'href',
      '/videoteca'
    );
    expect(screen.getByRole('link', { name: tr('hacienda.title') })).toHaveAttribute(
      'href',
      '/hacienda-paso-a-paso'
    );
    unmount();
    expect(document.title).not.toBe(tr('tools.rule.title'));
  });

  it('simulates the savings and lists every year', () => {
    renderWithProviders(<SavingsSimulatorPage />, { authenticated: false });
    expect(document.title).toBe(tr('tools.savings.title'));
    expect(screen.getAllByRole('row')).toHaveLength(11); // header + 10 years
    fireEvent.change(screen.getByLabelText(tr('tools.savings.years')), { target: { value: '0' } });
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.change(screen.getByLabelText(tr('tools.savings.years')), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(tr('tools.savings.rate')), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(tr('tools.savings.monthly')), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(tr('tools.savings.initial')), {
      target: { value: '1000' },
    });
    const final = screen
      .getByRole('heading', { name: tr('tools.savings.final') })
      .closest('section') as HTMLElement;
    expect(within(final).getByText(/3\.?400/)).toBeInTheDocument();
    expect(screen.getByText(tr('tools.savings.disclaimer'))).toBeInTheDocument();
  });

  it('writes the amounts in the language of the visitor', () => {
    renderWithProviders(<BudgetRulePage />, { authenticated: false, locale: 'en' });
    expect(screen.getByText('€900')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /50\s?% · Needs/ })).toBeInTheDocument();
  });
});

describe('loanPayment', () => {
  it('computes the fixed instalment, the total and the interest', () => {
    const loan = loanPayment({ principal: 150000, annualRatePct: 3, years: 25 });
    expect(loan.monthlyPayment).toBeCloseTo(711.37, 1);
    expect(Math.abs(loan.totalPaid - loan.monthlyPayment * 300)).toBeLessThan(1);
    expect(loan.totalInterest).toBeCloseTo(loan.totalPaid - 150000, 1);
  });

  it('is the principal split evenly without interest, and zero for nonsense', () => {
    expect(loanPayment({ principal: 12000, annualRatePct: 0, years: 1 })).toEqual({
      monthlyPayment: 1000,
      totalPaid: 12000,
      totalInterest: 0,
    });
    const none = { monthlyPayment: 0, totalPaid: 0, totalInterest: 0 };
    expect(loanPayment({ principal: -1, annualRatePct: 3, years: 5 })).toEqual(none);
    expect(loanPayment({ principal: 1000, annualRatePct: 3, years: 0 })).toEqual(none);
    expect(
      loanPayment({ principal: Number.NaN, annualRatePct: Number.NaN, years: Number.NaN })
    ).toEqual(none);
    expect(loanPayment({ principal: 1000, annualRatePct: -5, years: 1 }).totalInterest).toBe(0);
    // Capped at 50 years.
    expect(loanPayment({ principal: 600000, annualRatePct: 0, years: 500 }).monthlyPayment).toBe(
      1000
    );
  });
});

describe('vatBreakdown', () => {
  it('adds the VAT to a base and takes it out of a total', () => {
    expect(vatBreakdown(100, 21, false)).toEqual({ base: 100, vat: 21, total: 121 });
    expect(vatBreakdown(121, 21, true)).toEqual({ base: 100, vat: 21, total: 121 });
    expect(vatBreakdown(100, 0, true)).toEqual({ base: 100, vat: 0, total: 100 });
    expect(vatBreakdown(-5, Number.NaN, false)).toEqual({ base: 0, vat: 0, total: 0 });
    expect(vatBreakdown(Number.NaN, -3, true)).toEqual({ base: 0, vat: 0, total: 0 });
  });
});

describe('inflationEffect', () => {
  it('shows what the money is worth and what the same goods will cost', () => {
    const r = inflationEffect(10000, 3, 10);
    expect(r.worth).toBeCloseTo(7440.94, 1);
    expect(r.needed).toBeCloseTo(13439.16, 1);
    expect(r.lostPct).toBeCloseTo(25.6, 1);
  });

  it('is neutral with no inflation or years, and copes with nonsense', () => {
    expect(inflationEffect(500, 0, 5)).toEqual({ worth: 500, needed: 500, lostPct: 0 });
    expect(inflationEffect(500, 3, 0)).toEqual({ worth: 500, needed: 500, lostPct: 0 });
    expect(inflationEffect(Number.NaN, Number.NaN, Number.NaN)).toEqual({
      worth: 0,
      needed: 0,
      lostPct: 0,
    });
    expect(inflationEffect(100, 3, 1000).worth).toBeGreaterThanOrEqual(0);
    expect(inflationEffect(100, -90, 1).needed).toBe(50);
  });
});

describe('monthsToGoal', () => {
  it('counts the months until the balance reaches the target', () => {
    expect(monthsToGoal({ target: 1200, initial: 0, monthly: 100, annualRatePct: 0 })).toBe(12);
    expect(
      monthsToGoal({ target: 1000, initial: 0, monthly: 100, annualRatePct: 100 })
    ).toBeLessThan(10);
  });

  it('is zero when already there or without a target, and null when it never gets there', () => {
    expect(monthsToGoal({ target: 100, initial: 100, monthly: 0, annualRatePct: 0 })).toBe(0);
    expect(monthsToGoal({ target: 0, initial: 0, monthly: 0, annualRatePct: 0 })).toBe(0);
    expect(monthsToGoal({ target: 1000, initial: 0, monthly: 0, annualRatePct: 0 })).toBeNull();
    expect(
      monthsToGoal({
        target: Number.NaN,
        initial: Number.NaN,
        monthly: Number.NaN,
        annualRatePct: Number.NaN,
      })
    ).toBe(0);
    expect(monthsToGoal({ target: 100, initial: 1, monthly: 5, annualRatePct: Number.NaN })).toBe(
      20
    );
    expect(monthsToGoal({ target: 100, initial: 1, monthly: 5, annualRatePct: -500 })).toBeNull();
  });
});

describe('the other calculator pages', () => {
  const field = (key: string) => screen.getByLabelText(tr(key));
  const result = (key: string) =>
    screen.getByRole('heading', { name: tr(key) }).closest('section') as HTMLElement;

  it('lists every public calculator in the links, each with its own texts', () => {
    renderWithProviders(<LoanCalculatorPage />, { authenticated: false });
    for (const tool of TOOL_PAGES) {
      expect(screen.getByRole('link', { name: tr(`tools.${tool.key}.nav`) })).toHaveAttribute(
        'href',
        tool.path
      );
    }
  });

  it('calculates the loan instalment while typing', () => {
    renderWithProviders(<LoanCalculatorPage />, { authenticated: false });
    expect(document.title).toBe(tr('tools.loan.title'));
    expect(within(result('tools.loan.payment')).getByText(/711/)).toBeInTheDocument();
    fireEvent.change(field('tools.loan.years'), { target: { value: '0' } });
    expect(within(result('tools.loan.payment')).getByText(/^0\s?€$/)).toBeInTheDocument();
    expect(screen.getByText(tr('tools.loan.disclaimer'))).toBeInTheDocument();
  });

  it('adds and removes the VAT', () => {
    renderWithProviders(<VatCalculatorPage />, { authenticated: false });
    expect(within(result('tools.vat.total')).getByText(/121/)).toBeInTheDocument();
    fireEvent.change(field('tools.vat.mode'), { target: { value: 'with' } });
    fireEvent.change(field('tools.vat.amount'), { target: { value: '121' } });
    expect(within(result('tools.vat.base')).getByText(/100/)).toBeInTheDocument();
    fireEvent.change(field('tools.vat.rate'), { target: { value: '10' } });
    expect(within(result('tools.vat.vat')).getByText(/11/)).toBeInTheDocument();
    fireEvent.change(field('tools.vat.mode'), { target: { value: 'without' } });
    expect(within(result('tools.vat.total')).getByText(/133/)).toBeInTheDocument();
  });

  it('shows what inflation does to the money', () => {
    renderWithProviders(<InflationCalculatorPage />, { authenticated: false });
    expect(within(result('tools.inflation.worth')).getByText(/7\.?441/)).toBeInTheDocument();
    expect(within(result('tools.inflation.lost')).getByText(/25,6 %|25\.6 %/)).toBeInTheDocument();
    fireEvent.change(field('tools.inflation.years'), { target: { value: '0' } });
    expect(within(result('tools.inflation.lost')).getByText(/^0 %$/)).toBeInTheDocument();
  });

  it('tells how long it takes to reach the goal', () => {
    renderWithProviders(<GoalCalculatorPage />, { authenticated: false });
    expect(within(result('tools.goal.time')).getByText(/2 años y \d+ meses/)).toBeInTheDocument();
    fireEvent.change(field('tools.goal.monthly'), { target: { value: '0' } });
    fireEvent.change(field('tools.goal.rate'), { target: { value: '0' } });
    expect(within(result('tools.goal.time')).getByText(tr('tools.goal.never'))).toBeInTheDocument();
    fireEvent.change(field('tools.goal.initial'), { target: { value: '9000' } });
    expect(
      within(result('tools.goal.time')).getByText(tr('tools.goal.already'))
    ).toBeInTheDocument();
  });
});

describe('calculator pages for signed-in users', () => {
  it('do not show the sign-up panel', () => {
    renderWithProviders(<BudgetRulePage />, { authenticated: true });
    expect(screen.queryByRole('link', { name: tr('tools.cta.button') })).toBeNull();
  });
});

describe('income tax return helpers', () => {
  it('requires the return above 22,000 € or 15,000 € with a second payer over 1,500 €', async () => {
    const { rentaObligation } = await import('@modules/tools/domain/calculators');
    expect(rentaObligation({ mainIncome: 22_000, otherIncome: 0 })).toEqual({
      required: false,
      reason: 'none',
    });
    expect(rentaObligation({ mainIncome: 22_001, otherIncome: 0 })).toEqual({
      required: true,
      reason: 'overLimit',
    });
    expect(rentaObligation({ mainIncome: 15_500, otherIncome: 1_501 })).toEqual({
      required: true,
      reason: 'twoPayers',
    });
    expect(rentaObligation({ mainIncome: 20_000, otherIncome: 1_500 }).required).toBe(false);
    expect(rentaObligation({ mainIncome: 15_000, otherIncome: 100 }).required).toBe(false);
    expect(rentaObligation({ mainIncome: -5, otherIncome: Number.NaN }).required).toBe(false);
  });

  it('estimates the pension plan and donation deductions', async () => {
    const { pensionSaving, donationDeduction } = await import('@modules/tools/domain/calculators');
    expect(pensionSaving(1000, 30)).toBe(300);
    expect(pensionSaving(5000, 30)).toBe(450);
    expect(pensionSaving(-5, 30)).toBe(0);
    expect(pensionSaving(1000, Number.NaN)).toBe(0);
    expect(donationDeduction(100)).toBe(80);
    expect(donationDeduction(250)).toBe(200);
    expect(donationDeduction(450)).toBe(280);
    expect(donationDeduction(-1)).toBe(0);
  });
});
