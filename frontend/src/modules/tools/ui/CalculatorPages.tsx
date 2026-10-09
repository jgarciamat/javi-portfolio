import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { PublicHeader } from '@shared/components/PublicHeader';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { parseDecimal } from '@shared/utils/numbers';
import { budgetRule, simulateSavings } from '../domain/calculators';
import './css/Tools.css';

function useMoney() {
  const { locale } = useI18n();
  const formatter = new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    useGrouping: 'always' as unknown as boolean, // also 1.000 (es-ES skips the dot under 10.000)
  });
  return (n: number) => formatter.format(n);
}

function CalculatorLayout({
  path,
  titleKey,
  descriptionKey,
  children,
}: {
  path: string;
  titleKey: string;
  descriptionKey: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  usePageMeta(t(titleKey), t(descriptionKey), path);
  return (
    <div className="pricing-page">
      <PublicHeader />
      <main className="pricing-main tools-main">
        <h1 className="pricing-title">{t(titleKey)}</h1>
        <p className="pricing-subtitle">{t(descriptionKey)}</p>
        {children}
        <section className="tools-cta">
          <h2>{t('tools.cta.title')}</h2>
          <p>{t('tools.cta.body')}</p>
          <Link className="btn-primary" to="/login?mode=register">
            {t('tools.cta.button')}
          </Link>
        </section>
        <p className="pricing-links">
          <Link to="/calculadora-50-30-20">{t('tools.rule.nav')}</Link> ·{' '}
          <Link to="/simulador-ahorro">{t('tools.savings.nav')}</Link> ·{' '}
          <Link to="/pricing">{t('pricing.link')}</Link>
        </p>
      </main>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <div className="tools-field">
      <label htmlFor={id}>{label}</label>
      <span className="tools-input">
        <input
          id={id}
          className="tx-input"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <small>{suffix}</small>}
      </span>
    </div>
  );
}

const number = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
