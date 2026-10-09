import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useResource } from '@shared/hooks/useResource';
import { storage } from '@shared/utils/storage';
import { useFinances } from '../../application/FinancesContext';
import '../css/GettingStarted.css';

const STORAGE_KEY = 'mm_recap_seen';

/** Closing figures of the previous month, shown once at the start of the next one. */
export function MonthRecap() {
  const { monthApi } = useApi();
  const { t, tCategory } = useI18n();
  const { money, percent, monthLabel } = useFormat();
  const { year, month } = useFinances();
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const current = `${year}-${month}`;
  const [seen, setSeen] = useState(() => storage.get(STORAGE_KEY) === current);
  const { data } = useResource(
    () => monthApi.get(previous.year, previous.month),
    [monthApi, previous.year, previous.month],
    { enabled: !seen }
  );
  const summary = data?.summary;
  if (seen || !summary || summary.transactionCount === 0) return null;

  const top = Object.entries(summary.expensesByCategory).sort((a, b) => b[1] - a[1])[0];
  const rate = summary.totalIncome > 0 ? (summary.totalSaving / summary.totalIncome) * 100 : 0;
  const dismiss = () => {
    storage.set(STORAGE_KEY, current);
    setSeen(true);
  };

  return (
    <section
      className="card month-recap"
      aria-label={t('app.recap.title', { month: monthLabel(previous.year, previous.month) })}
    >
      <div className="getting-started-head">
        <h2 className="section-title">
          🗓️ {t('app.recap.title', { month: monthLabel(previous.year, previous.month) })}
        </h2>
        <button className="btn-link" onClick={dismiss}>
          {t('app.recap.dismiss')}
        </button>
      </div>
      <p>
        {t('app.recap.line', {
          income: money(summary.totalIncome),
          expenses: money(summary.totalExpenses),
          saving: money(summary.totalSaving),
        })}
      </p>
      <p>
        {summary.balance >= 0
          ? t('app.recap.balanceUp', { balance: money(summary.balance) })
          : t('app.recap.balanceDown', { balance: money(-summary.balance) })}
      </p>
      {top && <p>{t('app.recap.top', { category: tCategory(top[0]), amount: money(top[1]) })}</p>}
      {summary.totalIncome > 0 && <p>{t('app.recap.rate', { rate: percent(rate, 0) })}</p>}
    </section>
  );
}
