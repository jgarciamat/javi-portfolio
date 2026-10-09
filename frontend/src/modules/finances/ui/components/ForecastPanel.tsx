import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import { useResource } from '@shared/hooks/useResource';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import type { Forecast, SafeToSpend } from '@modules/finances/domain/types';
import '@modules/billing/ui/css/Billing.css';
import { useFinances } from '../../application/FinancesContext';
import '../css/ForecastPanel.css';

const RANGES = [3, 6, 12];

const STATUS_KEYS: Record<SafeToSpend['status'], string> = {
  ok: 'app.forecast.status.ok',
  tight: 'app.forecast.status.tight',
  over: 'app.forecast.status.over',
};

/** What is left today, per day, and how the month will probably end. */
function SafeToSpendBlock({ safe }: { safe: SafeToSpend }) {
  const { t } = useI18n();
  const { money } = useFormat();
  return (
    <div className={`forecast-safe forecast-safe--${safe.status}`}>
      <p className="forecast-daily">
        {safe.status === 'over' ? (
          t('app.forecast.noneLeft')
        ) : (
          <>
            <strong>{money(safe.daily)}</strong> {t('app.forecast.perDay')}
          </>
        )}
      </p>
      <p className="forecast-detail">
        {t('app.forecast.left', { amount: money(safe.available), days: safe.daysLeft })}
      </p>
      <p className="forecast-detail">
        {t('app.forecast.projectedEnd', { amount: money(safe.projectedEnd) })}
      </p>
      <p className="forecast-status">{t(STATUS_KEYS[safe.status])}</p>
    </div>
  );
}

/** Month-by-month outlook with "what if I cancel…" scenarios (Premium). */
function Outlook({
  forecast,
  months,
  onMonths,
  excluded,
  onToggle,
}: {
  forecast: Forecast;
  months: number;
  onMonths: (value: number) => void;
  excluded: string[];
  onToggle: (id: string) => void;
}) {
  const { t } = useI18n();
  const { money, monthLabel } = useFormat();
  const expenses = forecast.rules.filter((r) => r.type === 'EXPENSE');
  const shortfall = forecast.firstShortfall;

  return (
    <div className="forecast-outlook">
      <div className="section-header">
        <h3 className="forecast-subtitle">
          {t('app.forecast.outlook')} <span className="premium-chip">Premium</span>
        </h3>
        <select
          className="tx-input select-compact"
          value={months}
          onChange={(e) => onMonths(Number(e.target.value))}
          aria-label={t('app.forecast.range')}
        >
          {RANGES.map((r) => (
            <option key={r} value={r}>
              {t('app.forecast.months', { count: r })}
            </option>
          ))}
        </select>
      </div>
      {shortfall ? (
        <p className="forecast-warning" role="alert">
          ⚠️ {t('app.forecast.shortfall', { month: monthLabel(shortfall.year, shortfall.month) })}
        </p>
      ) : (
        <p className="forecast-good">✅ {t('app.forecast.noShortfall')}</p>
      )}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {['month', 'income', 'expenses', 'saving', 'endAvailable'].map((c) => (
                <th key={c}>{t(`app.forecast.col.${c}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forecast.projection?.map((p) => (
              <tr key={`${p.year}-${p.month}`}>
                <td>{monthLabel(p.year, p.month)}</td>
                <td>{money(p.income)}</td>
                <td>{money(p.fixedExpenses + p.variableExpenses)}</td>
                <td>{money(p.saving)}</td>
                <td className={p.endAvailable < 0 ? 'forecast-negative' : undefined}>
                  {money(p.endAvailable)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {expenses.length > 0 && (
        <fieldset className="forecast-whatif">
          <legend>{t('app.forecast.whatIf')}</legend>
          {expenses.map((rule) => (
            <label key={rule.id}>
              <input
                type="checkbox"
                checked={excluded.includes(rule.id)}
                onChange={() => onToggle(rule.id)}
              />{' '}
              {t('app.forecast.without', { name: rule.description, amount: money(rule.amount) })}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

/** "Do I reach the end of the month?" for everyone; the outlook of the next months is Premium. */
export function ForecastPanel() {
  const { insightsApi } = useApi();
  const { t } = useI18n();
  const plan = useOptionalPlan();
  const { available } = useFinances();
  const [months, setMonths] = useState(6);
  const [excluded, setExcluded] = useState<string[]>([]);
  const { data, error } = useResource(
    () => insightsApi.forecast(months, excluded),
    [insightsApi, months, excluded.join(','), available]
  );
  const toggle = (id: string) =>
    setExcluded((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <CollapsiblePanel title={<>🔮 {t('app.forecast.title')}</>} tourId="forecast">
      {error && <p className="form-error">{error}</p>}
      {!data && !error && <p className="section-hint">{t('app.common.loading')}</p>}
      {data && (
        <>
          <SafeToSpendBlock safe={data.safeToSpend} />
          {data.locked ? (
            <div className="forecast-locked">
              <p className="section-hint">
                🔒 {t('app.forecast.locked')} <span className="premium-chip">Premium</span>
              </p>
              {plan && (
                <button
                  className="btn-primary"
                  onClick={() => plan.openUpgrade({ kind: 'feature', feature: 'forecast' })}
                >
                  {t('billing.seePlans')}
                </button>
              )}
            </div>
          ) : (
            <Outlook
              forecast={data}
              months={months}
              onMonths={setMonths}
              excluded={excluded}
              onToggle={toggle}
            />
          )}
        </>
      )}
    </CollapsiblePanel>
  );
}
