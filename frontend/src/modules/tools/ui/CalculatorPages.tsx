import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { useI18n } from '@core/i18n/I18nContext';
import { appTabPath } from '@shared/utils/appLinks';
import {
  budgetRule,
  inflationEffect,
  loanPayment,
  monthsToGoal,
  simulateSavings,
  vatBreakdown,
} from '../domain/calculators';
import { CalculatorLayout, NumberField, number, useMoney } from './CalculatorLayout';
import { RentaAssistant } from './renta/RentaWizard';
import { CampaignDates } from './renta/CampaignDates';
import { rentaState } from '../data/renta/state';

/** 50/30/20: how to split a net monthly income. */
export function BudgetRulePage() {
  const { t } = useI18n();
  const money = useMoney();
  const [income, setIncome] = useState('1800');
  const split = budgetRule(number(income));
  const parts = [
    { key: 'needs', pct: 50, amount: split.needs },
    { key: 'wants', pct: 30, amount: split.wants },
    { key: 'saving', pct: 20, amount: split.saving },
  ] as const;

  return (
    <CalculatorLayout
      path="/calculadora-50-30-20"
      titleKey="tools.rule.title"
      descriptionKey="tools.rule.description"
    >
      <NumberField
        id="income"
        label={t('tools.rule.income')}
        value={income}
        onChange={setIncome}
        suffix="€"
      />
      <div className="tools-results" aria-live="polite">
        {parts.map((p) => (
          <section key={p.key} className={`tools-result tools-result--${p.key}`}>
            <h2>
              {p.pct} % · {t(`tools.rule.${p.key}`)}
            </h2>
            <p className="tools-amount">{money(p.amount)}</p>
            <p className="plan-note">{t(`tools.rule.${p.key}Hint`)}</p>
          </section>
        ))}
      </div>
    </CalculatorLayout>
  );
}

/** What regular saving grows to with compound interest. */
export function SavingsSimulatorPage() {
  const { t } = useI18n();
  const money = useMoney();
  const [initial, setInitial] = useState('1000');
  const [monthly, setMonthly] = useState('150');
  const [rate, setRate] = useState('3');
  const [years, setYears] = useState('10');
  const result = simulateSavings({
    initial: number(initial),
    monthly: number(monthly),
    annualRatePct: number(rate),
    years: number(years),
  });

  return (
    <CalculatorLayout
      path="/simulador-ahorro"
      titleKey="tools.savings.title"
      descriptionKey="tools.savings.description"
    >
      <div className="tools-form">
        <NumberField
          id="initial"
          label={t('tools.savings.initial')}
          value={initial}
          onChange={setInitial}
          suffix="€"
        />
        <NumberField
          id="monthly"
          label={t('tools.savings.monthly')}
          value={monthly}
          onChange={setMonthly}
          suffix="€"
        />
        <NumberField
          id="rate"
          label={t('tools.savings.rate')}
          value={rate}
          onChange={setRate}
          suffix="%"
        />
        <NumberField
          id="years"
          label={t('tools.savings.years')}
          value={years}
          onChange={setYears}
        />
      </div>
      <div className="tools-results" aria-live="polite">
        <section className="tools-result">
          <h2>{t('tools.savings.final')}</h2>
          <p className="tools-amount">{money(result.finalBalance)}</p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.savings.contributed')}</h2>
          <p className="tools-amount">{money(result.contributed)}</p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.savings.interest')}</h2>
          <p className="tools-amount">{money(result.interest)}</p>
        </section>
      </div>
      {result.yearly.length > 0 && (
        <table className="pricing-table">
          <thead>
            <tr>
              <th>{t('tools.savings.year')}</th>
              <th>{t('tools.savings.contributed')}</th>
              <th>{t('tools.savings.balance')}</th>
            </tr>
          </thead>
          <tbody>
            {result.yearly.map((y) => (
              <tr key={y.year}>
                <td>{y.year}</td>
                <td>{money(y.contributed)}</td>
                <td>{money(y.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="plan-note">{t('tools.savings.disclaimer')}</p>
    </CalculatorLayout>
  );
}

/** Monthly instalment of a loan or mortgage. */
export function LoanCalculatorPage() {
  const { t } = useI18n();
  const money = useMoney();
  const [principal, setPrincipal] = useState('150000');
  const [rate, setRate] = useState('3');
  const [years, setYears] = useState('25');
  const result = loanPayment({
    principal: number(principal),
    annualRatePct: number(rate),
    years: number(years),
  });

  return (
    <CalculatorLayout
      path="/calculadora-hipoteca"
      titleKey="tools.loan.title"
      descriptionKey="tools.loan.description"
    >
      <div className="tools-form">
        <NumberField
          id="principal"
          label={t('tools.loan.principal')}
          value={principal}
          onChange={setPrincipal}
          suffix="€"
        />
        <NumberField
          id="loan-rate"
          label={t('tools.loan.rate')}
          value={rate}
          onChange={setRate}
          suffix="%"
        />
        <NumberField
          id="loan-years"
          label={t('tools.loan.years')}
          value={years}
          onChange={setYears}
        />
      </div>
      <div className="tools-results" aria-live="polite">
        <section className="tools-result">
          <h2>{t('tools.loan.payment')}</h2>
          <p className="tools-amount">{money(result.monthlyPayment)}</p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.loan.total')}</h2>
          <p className="tools-amount">{money(result.totalPaid)}</p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.loan.interest')}</h2>
          <p className="tools-amount">{money(result.totalInterest)}</p>
        </section>
      </div>
      <p className="plan-note">{t('tools.loan.disclaimer')}</p>
    </CalculatorLayout>
  );
}

/** Add VAT to an amount or take it out of one. */
export function VatCalculatorPage() {
  const { t } = useI18n();
  const money = useMoney();
  const [amount, setAmount] = useState('100');
  const [rate, setRate] = useState('21');
  const [withVat, setWithVat] = useState(false);
  const result = vatBreakdown(number(amount), number(rate), withVat);

  return (
    <CalculatorLayout
      path="/calculadora-iva"
      titleKey="tools.vat.title"
      descriptionKey="tools.vat.description"
    >
      <div className="tools-form">
        <NumberField
          id="vat-amount"
          label={t('tools.vat.amount')}
          value={amount}
          onChange={setAmount}
          suffix="€"
        />
        <div className="tools-field">
          <label htmlFor="vat-rate">{t('tools.vat.rate')}</label>
          <select
            id="vat-rate"
            className="tx-input"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          >
            {['21', '10', '4', '0'].map((r) => (
              <option key={r} value={r}>
                {r} %
              </option>
            ))}
          </select>
        </div>
        <div className="tools-field">
          <label htmlFor="vat-mode">{t('tools.vat.mode')}</label>
          <select
            id="vat-mode"
            className="tx-input"
            value={withVat ? 'with' : 'without'}
            onChange={(e) => setWithVat(e.target.value === 'with')}
          >
            <option value="without">{t('tools.vat.without')}</option>
            <option value="with">{t('tools.vat.with')}</option>
          </select>
        </div>
      </div>
      <div className="tools-results" aria-live="polite">
        <section className="tools-result">
          <h2>{t('tools.vat.base')}</h2>
          <p className="tools-amount">{money(result.base)}</p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.vat.vat')}</h2>
          <p className="tools-amount">{money(result.vat)}</p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.vat.total')}</h2>
          <p className="tools-amount">{money(result.total)}</p>
        </section>
      </div>
      <p className="plan-note">{t('tools.vat.disclaimer')}</p>
    </CalculatorLayout>
  );
}

/** What inflation does to an amount of money over the years. */
export function InflationCalculatorPage() {
  const { t } = useI18n();
  const money = useMoney();
  const [amount, setAmount] = useState('10000');
  const [inflation, setInflation] = useState('3');
  const [years, setYears] = useState('10');
  const result = inflationEffect(number(amount), number(inflation), number(years));

  return (
    <CalculatorLayout
      path="/calculadora-inflacion"
      titleKey="tools.inflation.title"
      descriptionKey="tools.inflation.description"
    >
      <div className="tools-form">
        <NumberField
          id="inflation-amount"
          label={t('tools.inflation.amount')}
          value={amount}
          onChange={setAmount}
          suffix="€"
        />
        <NumberField
          id="inflation-rate"
          label={t('tools.inflation.rate')}
          value={inflation}
          onChange={setInflation}
          suffix="%"
        />
        <NumberField
          id="inflation-years"
          label={t('tools.inflation.years')}
          value={years}
          onChange={setYears}
        />
      </div>
      <div className="tools-results" aria-live="polite">
        <section className="tools-result">
          <h2>{t('tools.inflation.worth')}</h2>
          <p className="tools-amount">{money(result.worth)}</p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.inflation.needed')}</h2>
          <p className="tools-amount">{money(result.needed)}</p>
        </section>
        <section className="tools-result">
          <h2>{t('tools.inflation.lost')}</h2>
          <p className="tools-amount">{result.lostPct} %</p>
        </section>
      </div>
      <p className="plan-note">{t('tools.inflation.disclaimer')}</p>
    </CalculatorLayout>
  );
}

/** How long it takes to reach a savings target. */
export function GoalCalculatorPage() {
  const { t } = useI18n();
  const [target, setTarget] = useState('5000');
  const [initial, setInitial] = useState('500');
  const [monthly, setMonthly] = useState('150');
  const [rate, setRate] = useState('2');
  const months = monthsToGoal({
    target: number(target),
    initial: number(initial),
    monthly: number(monthly),
    annualRatePct: number(rate),
  });
  const years = months === null ? 0 : Math.floor(months / 12);
  const rest = months === null ? 0 : months % 12;

  return (
    <CalculatorLayout
      path="/calculadora-objetivo-ahorro"
      titleKey="tools.goal.title"
      descriptionKey="tools.goal.description"
    >
      <div className="tools-form">
        <NumberField
          id="goal-target"
          label={t('tools.goal.target')}
          value={target}
          onChange={setTarget}
          suffix="€"
        />
        <NumberField
          id="goal-initial"
          label={t('tools.goal.initial')}
          value={initial}
          onChange={setInitial}
          suffix="€"
        />
        <NumberField
          id="goal-monthly"
          label={t('tools.goal.monthly')}
          value={monthly}
          onChange={setMonthly}
          suffix="€"
        />
        <NumberField
          id="goal-rate"
          label={t('tools.goal.rate')}
          value={rate}
          onChange={setRate}
          suffix="%"
        />
      </div>
      <div className="tools-results" aria-live="polite">
        <section className="tools-result">
          <h2>{t('tools.goal.time')}</h2>
          <p className="tools-amount">
            {months === null
              ? t('tools.goal.never')
              : months === 0
              ? t('tools.goal.already')
              : t('tools.goal.result', { years, months: rest, total: months })}
          </p>
        </section>
      </div>
      <p className="plan-note">{t('tools.goal.disclaimer')}</p>
    </CalculatorLayout>
  );
}

/** Public page of the income tax return calculator; signed-in people go to the section of the app. */
export function RentaCalculatorPage() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to={appTabPath('renta')} replace />;
  return (
    <CalculatorLayout
      path="/calculadora-renta"
      titleKey="tools.renta.title"
      descriptionKey="tools.renta.description"
      lead={<CampaignDates exercise={rentaState.year} />}
    >
      <RentaAssistant mode="local" />
    </CalculatorLayout>
  );
}
