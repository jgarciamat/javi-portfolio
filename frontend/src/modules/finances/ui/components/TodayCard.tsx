import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useResource } from '@shared/hooks/useResource';
import { todayDateOnly } from '@shared/utils/format';
import { useFinances } from '../../application/FinancesContext';
import '../css/TodayCard.css';

/** What is spent today and what is left to spend today, from the end-of-month forecast. */
export function TodayCard() {
  const { insightsApi } = useApi();
  const { t } = useI18n();
  const { money } = useFormat();
  const { available, transactions } = useFinances();
  const { data } = useResource(() => insightsApi.forecast(3, []), [insightsApi, available]);
  if (!data) return null;

  const safe = data.safeToSpend;
  const today = todayDateOnly();
  const spentToday = transactions
    .filter((tx) => tx.type === 'EXPENSE' && tx.date === today)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const left = safe.status === 'over' ? 0 : Math.max(0, safe.daily);
  const allowance = left + spentToday;
  const used = allowance > 0 ? Math.min(100, (spentToday / allowance) * 100) : 100;

  return (
    <section
      className={`card today-card today-card--${safe.status}`}
      aria-label={t('app.today.title')}
    >
      <p className="today-label">
        <Icon name="sparkles" /> {t('app.today.title')}
      </p>
      <p className="today-amount">{safe.status === 'over' ? t('app.today.none') : money(left)}</p>
      <div
        className="today-bar"
        role="progressbar"
        aria-label={t('app.today.progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(used)}
      >
        <span style={{ width: `${used}%` }} />
      </div>
      <p className="today-detail">
        {t('app.today.spent', { spent: money(spentToday), allowance: money(allowance) })}
      </p>
      <p className="today-detail">
        {t('app.today.month', { amount: money(safe.available), days: safe.daysLeft })}
      </p>
    </section>
  );
}
