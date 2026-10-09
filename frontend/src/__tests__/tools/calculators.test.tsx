import { fireEvent, screen, within } from '@testing-library/react';
import { budgetRule, simulateSavings } from '@modules/tools/domain/calculators';
import { BudgetRulePage, SavingsSimulatorPage } from '@modules/tools/ui/CalculatorPages';
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
