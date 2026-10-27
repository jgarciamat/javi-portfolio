import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useAction } from '@shared/hooks/useAction';
import { useExportCSV } from '../../application/hooks/useExportCSV';
import { useTablePdf } from '../../application/hooks/useTablePdf';
import { useFinances } from '../../application/FinancesContext';
import { MonthRecapDialog } from './MonthRecap';
import '../css/MonthActions.css';

/**
 * Which buttons the month shows. While it loads they are already there (disabled): the page
 * does not jump when the movements arrive.
 */
function buttonsOf(f: ReturnType<typeof useFinances>) {
  const waiting = f.loading && f.transactions.length === 0;
  return {
    waiting,
    hasMovements: f.transactions.length > 0 || waiting,
    hasSummary: (f.summary?.transactionCount ?? 0) > 0 || waiting,
  };
}

/** What can be done with the month: export it (CSV or PDF), read its recap, import a statement. */
export function MonthActions({ onImport }: { onImport?: () => void }) {
  const { t } = useI18n();
  const format = useFormat();
  const { exportMonthCSV, transactionTable } = useExportCSV();
  const { downloadTablePdf } = useTablePdf();
  const pdf = useAction(t('app.exportButtons.error'));
  const f = useFinances();
  const [recapOpen, setRecapOpen] = useState(false);
  const { waiting, hasMovements, hasSummary } = buttonsOf(f);

  /** The movements of the month with its totals, free on every plan. */
  const exportMonthPdf = () =>
    pdf.run(() => {
      const month = format.monthLabel(f.year, f.month);
      const s = f.summary;
      const totals = s
        ? {
            income: s.totalIncome,
            expenses: s.totalExpenses,
            saving: s.totalSaving,
            balance: s.balance,
          }
        : undefined;
      return downloadTablePdf(
        `mes_${f.year}-${String(f.month).padStart(2, '0')}`,
        transactionTable(f.transactions, totals),
        t('app.export.monthTitle', { month }),
        month
      );
    });

  return (
    <div
      className="month-actions"
      data-tour="month-actions"
      role="group"
      aria-label={t('app.monthActions.ariaLabel')}
    >
      {/* Without movements there is nothing to export or sum up: the buttons wait for them. */}
      {hasMovements && (
        <>
          <button
            type="button"
            className="month-action"
            disabled={waiting}
            onClick={() => exportMonthCSV(f.transactions, f.summary, f.year, f.month)}
          >
            <Icon name="download" /> {t('app.export.month')}
          </button>
          <button
            type="button"
            className="month-action"
            disabled={waiting || pdf.pending}
            aria-busy={pdf.pending}
            onClick={() => void exportMonthPdf()}
          >
            <Icon name="file" />{' '}
            {pdf.pending ? t('app.report.preparing') : t('app.export.monthPdf')}
          </button>
        </>
      )}
      {hasSummary && (
        <button
          type="button"
          className="month-action"
          disabled={waiting}
          onClick={() => setRecapOpen(true)}
        >
          <Icon name="sparkles" /> {t('app.recap.open')}
        </button>
      )}
      {onImport && (
        <button type="button" className="month-action" data-tour="import" onClick={onImport}>
          <Icon name="upload" /> {t('app.import.open')}
        </button>
      )}
      {pdf.error && (
        <p className="form-error month-actions-error" role="alert">
          {pdf.error}
        </p>
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
