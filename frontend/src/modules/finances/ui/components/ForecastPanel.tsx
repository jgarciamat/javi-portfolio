import { ScrollRegion } from '@shared/components/ScrollRegion';
import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import { useResource } from '@shared/hooks/useResource';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import type { Forecast } from '@modules/finances/domain/types';
import '@modules/billing/ui/css/Billing.css';
import { useFinances } from '../../application/FinancesContext';
import { endOfMonthLikely } from '../../domain/enoughData';
import { todayDateOnly } from '@shared/utils/format';
import '../css/ForecastPanel.css';
import { Icon } from '@shared/components/Icon';
import type { DashboardTab } from '../navigation';
import { EndOfMonthBlock } from './EndOfMonthBlock';

const RANGES = [3, 6, 12];

/** «Sin Seguro hogar (180,00 €/año)»: the amount with the rule's own period. */
const WITHOUT_KEY: Record<Forecast['rules'][number]['frequency'], string> = {
  monthly: 'app.forecast.without',
  bimonthly: 'app.forecast.withoutBimonthly',
  quarterly: 'app.forecast.withoutQuarterly',
  yearly: 'app.forecast.withoutYearly',
};

/** The longer outlook and the scenarios, locked on the free plan. */
function LockedOutlook() {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  return (
    <div className="forecast-locked">
      <p className="section-hint">
        <Icon name="lock" /> {t('app.forecast.locked')}{' '}
        <span className="premium-chip">Premium</span>
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
  );
}

/**
 * Month-by-month outlook. Premium chooses up to 12 months and tries "what if I cancel…";
 * the free plan sees next month only.
 */
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
  const { money, monthLabel, monthName } = useFormat();
  const expenses = forecast.rules.filter((r) => r.type === 'EXPENSE');
  const shortfall = forecast.firstShortfall;
  const locked = forecast.locked;

  return (
    <div className="forecast-outlook">
      <div className="section-header">
        <h3 className="forecast-subtitle">
          {locked ? t('app.forecast.nextMonth') : t('app.forecast.outlook')}
        </h3>
        {!locked && (
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
        )}
      </div>
      {shortfall ? (
        <p className="forecast-warning" role="alert">
          <Icon name="alert" />{' '}
          {t('app.forecast.shortfall', { month: monthLabel(shortfall.year, shortfall.month) })}
        </p>
      ) : (
        <p className="forecast-good">
          <Icon name="checkCircle" /> {t('app.forecast.noShortfall')}
        </p>
      )}
      <ScrollRegion className="table-scroll" label={t('app.forecast.outlook')}>
        <table className="data-table">
          <thead>
            <tr>
              {['month', 'endAvailable', 'income', 'expenses', 'saving'].map((c) => (
                <th key={c}>{t(`app.forecast.col.${c}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forecast.projection.map((p) => (
              <tr key={`${p.year}-${p.month}`}>
                <td>
                  {monthName(p.month, 'short')} {String(p.year).slice(2)}
                </td>
                <td className={p.endAvailable < 0 ? 'forecast-negative' : undefined}>
                  <strong>{money(p.endAvailable)}</strong>
                </td>
                <td>{money(p.income)}</td>
                <td>{money(p.fixedExpenses + p.variableExpenses)}</td>
                <td>{money(p.saving)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
      {locked && <LockedOutlook />}
      {!locked && expenses.length > 0 && (
        <fieldset className="forecast-whatif">
          <legend>{t('app.forecast.whatIf')}</legend>
          {expenses.map((rule) => (
            <label key={rule.id}>
              <input
                type="checkbox"
                checked={excluded.includes(rule.id)}
                onChange={() => onToggle(rule.id)}
              />{' '}
              {t(WITHOUT_KEY[rule.frequency], {
                name: rule.description,
                amount: money(rule.amount),
              })}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

/**
 * A new account (its first week) gets «not enough data yet» instead of the end of the month: the
 * space kept while loading is that one's, much shorter.
 */
function useFewData(): boolean {
  const { transactions } = useFinances();
  const total = useOptionalPlan()?.overview?.usage.movements ?? null;
  return !endOfMonthLikely(transactions, total, todayDateOnly());
}

/**
 * The space kept while the forecast loads: the whole end of the month, next month only on the
 * free plan, or «not enough data yet» on a new account (see ForecastPanel.css).
 */
const loadingClass = (free: boolean | undefined, few: boolean): string =>
  ['forecast-panel--loading', free && 'forecast-panel--free', few && 'forecast-panel--few']
    .filter(Boolean)
    .join(' ');

/**
 * "Do I reach the end of the month?" and next month for everyone; the longer outlook is Premium.
 * `onOpenTab` opens the guides of «Qué hacer con lo que sobre» without leaving the app.
 */
export function ForecastPanel({ onOpenTab }: { onOpenTab?: (tab: DashboardTab) => void }) {
  const { insightsApi } = useApi();
  const { t } = useI18n();
  const { available, loading } = useFinances();
  // Known to be free: the space kept while loading is that of next month only.
  const free = useOptionalPlan()?.isFree;
  const few = useFewData();
  const [months, setMonths] = useState(6);
  const [excluded, setExcluded] = useState<string[]>([]);
  // Asked once the month is there: before, `available` would change under it and the
  // forecast (the heaviest request of the screen) was computed twice.
  const { data, error } = useResource(
    () => insightsApi.forecast(months, excluded),
    [insightsApi, months, excluded.join(','), available],
    { enabled: !loading }
  );
  const toggle = (id: string) =>
    setExcluded((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <CollapsiblePanel
      title={
        <>
          <Icon name="sparkles" /> {t('app.forecast.title')}
        </>
      }
      tourId="forecast"
      className={data || error ? undefined : loadingClass(free, few)}
    >
      {error && <p className="form-error">{error}</p>}
      {!data && !error && <p className="section-hint">{t('app.common.loading')}</p>}
      {data && (
        <>
          <EndOfMonthBlock plan={data.endOfMonth} onOpenTab={onOpenTab} />
          <Outlook
            forecast={data}
            months={months}
            onMonths={setMonths}
            excluded={excluded}
            onToggle={toggle}
          />
        </>
      )}
    </CollapsiblePanel>
  );
}
