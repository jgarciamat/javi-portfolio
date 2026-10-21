import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useExportCSV } from '../../application/hooks/useExportCSV';
import { useFinances } from '../../application/FinancesContext';
import { MonthRecapDialog } from './MonthRecap';
import '../css/MonthActions.css';

/** What can be done with the month: export it, read its recap, import a bank statement. */
export function MonthActions({ onImport }: { onImport?: () => void }) {
  const { t } = useI18n();
  const format = useFormat();
  const { exportMonthCSV } = useExportCSV();
  const f = useFinances();
  const [recapOpen, setRecapOpen] = useState(false);
  const hasMovements = f.transactions.length > 0;
  const hasSummary = !!f.summary && f.summary.transactionCount > 0;

  return (
    <div
      className="month-actions"
      data-tour="month-actions"
      role="group"
      aria-label={t('app.monthActions.ariaLabel')}
    >
      <button
        type="button"
        className="month-action"
        disabled={!hasMovements}
        onClick={() => exportMonthCSV(f.transactions, f.summary, f.year, f.month)}
      >
        <Icon name="download" /> {t('app.export.month')}
      </button>
      <button
        type="button"
        className="month-action"
        disabled={!hasSummary}
        onClick={() => setRecapOpen(true)}
      >
        <Icon name="sparkles" /> {t('app.recap.open')}
      </button>
      {onImport && (
        <button type="button" className="month-action" data-tour="import" onClick={onImport}>
          <Icon name="upload" /> {t('app.import.open')}
        </button>
      )}
      {recapOpen && f.summary && (
        <MonthRecapDialog
          summary={f.summary}
          month={format.monthLabel(f.year, f.month)}
          onClose={() => setRecapOpen(false)}
        />
      )}
    </div>
  );
}
