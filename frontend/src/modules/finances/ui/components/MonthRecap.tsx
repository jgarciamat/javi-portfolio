import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useResource } from '@shared/hooks/useResource';
import { storage } from '@shared/utils/storage';
import { useFinances } from '../../application/FinancesContext';
import '../css/GettingStarted.css';
import { Icon } from '@shared/components/Icon';
import { Modal } from '@shared/components/Modal';
import type { FinancialSummary } from '../../domain/types';
import { RecapShare } from './RecapShare';

const STORAGE_KEY = 'mm_recap_seen';

/** The figures of a closed period, in sentences. */
function RecapLines({ summary }: { summary: FinancialSummary }) {
  const { t, tCategory } = useI18n();
  const { money, percent } = useFormat();
  const top = Object.entries(summary.expensesByCategory).sort((a, b) => b[1] - a[1])[0];
  const rate = summary.totalIncome > 0 ? (summary.totalSaving / summary.totalIncome) * 100 : 0;
  return (
    <>
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
    </>
  );
}

/** The four figures of a month as tiles. */
function RecapTiles({ summary }: { summary: FinancialSummary }) {
  const { t } = useI18n();
  const { money, percent } = useFormat();
  const rate = summary.totalIncome > 0 ? (summary.totalSaving / summary.totalIncome) * 100 : 0;
  const tiles = [
    ['income', t('app.recap.income'), money(summary.totalIncome)],
    ['expenses', t('app.recap.expenses'), money(summary.totalExpenses)],
    ['saving', t('app.recap.saving'), money(summary.totalSaving)],
    ['rate', t('app.recap.rateLabel'), percent(rate, 0)],
  ];
  return (
    <div className="recap-tiles">
      {tiles.map(([id, label, value]) => (
        <div key={id} className={`recap-tile recap-tile--${id}`}>
          <small>{label}</small>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

/** The summary of the viewed month, on demand, with a preview of the picture to share. */
export function MonthRecapDialog({
  summary,
  month,
  onClose,
}: {
  summary: FinancialSummary;
  month: string;
  onClose: () => void;
}) {
  const { t, tCategory } = useI18n();
  const { money } = useFormat();
  const top = Object.entries(summary.expensesByCategory).sort((a, b) => b[1] - a[1])[0];
  return (
    <Modal
      label={t('app.recap.title', { month })}
      onClose={onClose}
      className="modal-panel recap-dialog"
    >
      <div className="modal-header">
        <h2 className="modal-title">
          <Icon name="calendar" /> {t('app.recap.title', { month })}
        </h2>
      </div>
      <div className="modal-body recap-body">
        <RecapTiles summary={summary} />
        <div className="recap-highlights">
          {top && (
            <p>{t('app.recap.top', { category: tCategory(top[0]), amount: money(top[1]) })}</p>
          )}
          <p>
            {summary.balance >= 0
              ? t('app.recap.balanceUp', { balance: money(summary.balance) })
              : t('app.recap.balanceDown', { balance: money(-summary.balance) })}
          </p>
        </div>
        <RecapShare summary={summary} month={month} preview />
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onClose}>
          {t('app.recap.dismiss')}
        </button>
      </div>
    </Modal>
  );
}

/** Closing figures of the previous month, shown once at the start of the next one. */
export function MonthRecap() {
  const { monthApi } = useApi();
  const { t } = useI18n();
  const { monthLabel } = useFormat();
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
          <Icon name="calendar" />{' '}
          {t('app.recap.title', { month: monthLabel(previous.year, previous.month) })}
        </h2>
        <button className="btn-link" onClick={dismiss}>
          {t('app.recap.dismiss')}
        </button>
      </div>
      <RecapLines summary={summary} />
      <RecapShare summary={summary} month={monthLabel(previous.year, previous.month)} />
    </section>
  );
}
