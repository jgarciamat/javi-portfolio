import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useAction } from '@shared/hooks/useAction';
import { parseDecimal } from '@shared/utils/numbers';
import type { Asset } from '../../domain/types';
import { compareDebtPlan, estimatedMinimum, type Debt, type Strategy } from '../../domain/debtPlan';
import '../css/Sections.css';

const STRATEGIES: Strategy[] = ['avalanche', 'snowball'];

/** An optional number as the text of its field. */
const fieldText = (value: number | null): string => (value === null ? '' : String(value));

/** An empty field means "not set". */
const optionalNumber = (text: string): number | null =>
  text.trim() === '' ? null : parseDecimal(text);

/** A rate between 0 and 100 % and a non-negative minimum, or left empty. */
function validTerms(interestRate: number | null, minPayment: number | null): boolean {
  return (
    (interestRate === null ||
      (Number.isFinite(interestRate) && interestRate >= 0 && interestRate <= 100)) &&
    (minPayment === null || (Number.isFinite(minPayment) && minPayment >= 0))
  );
}

/** Interest and minimum payment of one debt. */
function DebtTerms({ debt, onSaved }: { debt: Asset; onSaved: () => void }) {
  const { assetApi } = useApi();
  const { t } = useI18n();
  const action = useAction();
  const [rate, setRate] = useState(fieldText(debt.interestRate));
  const [min, setMin] = useState(fieldText(debt.minPayment));
  const interestRate = optionalNumber(rate);
  const minPayment = optionalNumber(min);
  const valid = validTerms(interestRate, minPayment);

  return (
    <li className="debt-terms">
      <strong>{debt.name}</strong>
      <label className="field">
        <span className="field-label">{t('app.debt.rate')}</span>
        <input
          className="tx-input"
          inputMode="decimal"
          aria-label={t('app.debt.rateOf', { name: debt.name })}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </label>
      <label className="field">
        <span className="field-label">{t('app.debt.min')}</span>
        <input
          className="tx-input"
          inputMode="decimal"
          placeholder={t('app.debt.minEstimated', { amount: estimatedMinimum(debt.value) })}
          aria-label={t('app.debt.minOf', { name: debt.name })}
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
      </label>
      <button
        className="btn-secondary"
        disabled={!valid || action.pending}
        aria-label={t('app.debt.saveOf', { name: debt.name })}
        onClick={() =>
          void action.run(async () => {
            await assetApi.setTerms(debt.id, { interestRate, minPayment });
            onSaved();
          })
        }
      >
        {t('app.debt.save')}
      </button>
      {action.error && <p className="form-error">{action.error}</p>}
    </li>
  );
}

function periodLabel(t: ReturnType<typeof useI18n>['t'], months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return years > 0
    ? t('app.debt.yearsMonths', { years, months: rest })
    : t('app.debt.onlyMonths', { months });
}

/** How and when the debts get paid, with the avalanche or the snowball method. */
export function DebtPlanCard({ debts, onChanged }: { debts: Asset[]; onChanged: () => void }) {
  const { t } = useI18n();
  const { money, monthYear } = useFormat();
  const [extra, setExtra] = useState('');
  const [strategy, setStrategy] = useState<Strategy>('avalanche');
  const extraAmount = Math.max(0, Number.isFinite(parseDecimal(extra)) ? parseDecimal(extra) : 0);

  const list: Debt[] = debts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.value,
    rate: d.interestRate ?? 0,
    minPayment: d.minPayment ?? estimatedMinimum(d.value),
  }));
  const result = compareDebtPlan(list, extraAmount, strategy);
  const now = new Date();
  const dateOf = (months: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + months, 1);
    return monthYear(d.getFullYear(), d.getMonth() + 1);
  };

  return (
    <div className="card">
      <h2 className="section-title">
        <Icon name="target" /> {t('app.debt.title')}
      </h2>
      <p className="section-hint">{t('app.debt.hint')}</p>
      <ul className="debt-terms-list">
        {debts.map((d) => (
          <DebtTerms
            key={`${d.id}-${d.interestRate}-${d.minPayment}`}
            debt={d}
            onSaved={onChanged}
          />
        ))}
      </ul>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t('app.debt.extra')}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('app.debt.method')}</span>
          <select
            className="tx-input"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as Strategy)}
          >
            {STRATEGIES.map((s) => (
              <option key={s} value={s}>
                {t(`app.debt.${s}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="debt-result" aria-live="polite">
        {result.plan.months === null ? (
          <p className="form-error">{t('app.debt.never')}</p>
        ) : (
          <>
            <p className="debt-free">
              <strong>
                {t('app.debt.free', {
                  time: periodLabel(t, result.plan.months),
                  date: dateOf(result.plan.months),
                })}
              </strong>
            </p>
            <p>{t('app.debt.interest', { amount: money(result.plan.totalInterest) })}</p>
            {result.interestSaved !== null &&
              result.monthsSaved !== null &&
              result.monthsSaved > 0 && (
                <p className="section-success">
                  <Icon name="checkCircle" />{' '}
                  {t('app.debt.saved', {
                    amount: money(result.interestSaved),
                    months: result.monthsSaved,
                  })}
                </p>
              )}
            <h3>{t('app.debt.order')}</h3>
            <ol className="debt-order">
              {result.plan.order.map((o) => (
                <li key={o.id}>
                  {t('app.debt.orderItem', { name: o.name, date: dateOf(o.month) })}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
      <p className="section-hint">{t('app.debt.disclaimer')}</p>
    </div>
  );
}
