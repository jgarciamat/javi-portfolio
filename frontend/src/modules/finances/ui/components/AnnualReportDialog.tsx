import { useRef } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useAction } from '@shared/hooks/useAction';
import { useDialog } from '@shared/hooks/useDialog';
import { useResource } from '@shared/hooks/useResource';
import type { AnnualReport, ReportTotals } from '@modules/finances/domain/types';
import { useExportCSV } from '../../application/hooks/useExportCSV';
import { useTablePdf } from '../../application/hooks/useTablePdf';
import { buildAnnualReportPdf, type AnnualPdfText } from '../../application/annualReportPdf';
import { pdfFileName, savePdf } from '../../application/tablePdf';
import '../css/AnnualReportDialog.css';
import { Icon } from '@shared/components/Icon';

function PeriodTable({
  title,
  firstColumn,
  rows,
  total,
}: {
  title: string;
  firstColumn: string;
  rows: ({ label: string } & ReportTotals)[];
  total?: ReportTotals;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const columns = ['income', 'expenses', 'saving', 'balance'] as const;
  return (
    <section className="report-section">
      <h3>{title}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>{firstColumn}</th>
            {columns.map((c) => (
              <th key={c}>{t(`app.annual.table.${c}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              {columns.map((c) => (
                <td key={c}>{money(row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr>
              <th>{t('app.export.csv.total')}</th>
              {columns.map((c) => (
                <th key={c}>{money(total[c])}</th>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </section>
  );
}

function CategoryTable({
  title,
  rows,
}: {
  title: string;
  rows: AnnualReport['expensesByCategory'];
}) {
  const { t, tCategory } = useI18n();
  const { money, percent } = useFormat();
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  return (
    <section className="report-section">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="empty-state">{t('app.report.noData')}</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('app.export.csv.category')}</th>
              <th>{t('app.export.csv.amount')}</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.categoryName}>
                <td>{tCategory(r.categoryName)}</td>
                <td>{money(r.amount)}</td>
                <td>{percent((r.amount / total) * 100, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** The words of the PDF, in the language of the app. */
function usePdfText(): AnnualPdfText {
  const { t } = useI18n();
  const { monthName } = useFormat();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return {
    summary: t('app.report.summary'),
    chart: t('app.report.chart'),
    byMonth: t('app.report.byMonth'),
    quarters: t('app.report.quarters'),
    quarter: t('app.report.quarter'),
    expensesByCategory: t('app.report.expensesByCategory'),
    incomeByCategory: t('app.report.incomeByCategory'),
    noData: t('app.report.noData'),
    disclaimer: t('app.report.disclaimer'),
    total: t('app.export.csv.total'),
    month: t('app.annual.table.month'),
    income: t('app.annual.table.income'),
    expenses: t('app.annual.table.expenses'),
    saving: t('app.annual.table.saving'),
    balance: t('app.annual.table.balance'),
    category: t('app.export.csv.category'),
    amount: t('app.export.csv.amount'),
    monthNames: months.map((m) => monthName(m)),
    monthShort: months.map((m) => monthName(m, 'short')),
  };
}

/** Yearly summary (months, quarters, categories) as a PDF to keep or send, or to print. */
export function AnnualReportDialog({ year, onClose }: { year: number; onClose: () => void }) {
  const { insightsApi } = useApi();
  const { t, tCategory } = useI18n();
  const { monthName, locale } = useFormat();
  const dialog = useRef<HTMLDivElement>(null);
  useDialog(dialog, onClose, true);
  const { exportReportCSV } = useExportCSV();
  const { words, header } = useTablePdf();
  const text = usePdfText();
  const pdf = useAction(t('app.exportButtons.error'));
  const { data, error } = useResource(() => insightsApi.report(year), [insightsApi, year]);
  const title = `${t('app.report.title')} ${year}`;

  /** Free on every plan: it does not count as one of the self-employed PDFs. */
  const downloadPdf = (report: AnnualReport) =>
    pdf.run(async () => {
      const named = (list: AnnualReport['expensesByCategory']) =>
        list.map((c) => ({ ...c, categoryName: tCategory(c.categoryName) }));
      const blob = await buildAnnualReportPdf(
        {
          ...report,
          expensesByCategory: named(report.expensesByCategory),
          incomeByCategory: named(report.incomeByCategory),
        },
        { header: header(title, String(year)), words, text, locale }
      );
      await savePdf(blob, pdfFileName(`informe-anual_${year}`), title);
    });

  return (
    <div className="report-overlay">
      <div
        ref={dialog}
        className="report-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="report-head">
          <h2>
            <Icon name="file" /> {t('app.report.title')} {year}
          </h2>
          <div className="report-actions">
            {data && (
              <>
                <button
                  className="btn-primary"
                  disabled={pdf.pending}
                  aria-busy={pdf.pending}
                  aria-label={t('app.exportButtons.pdfFor', { what: title })}
                  onClick={() => void downloadPdf(data)}
                >
                  <Icon name="file" />{' '}
                  {pdf.pending ? t('app.report.preparing') : t('app.report.pdf')}
                </button>
                <button className="btn-secondary" onClick={() => window.print()}>
                  <Icon name="print" /> {t('app.report.print')}
                </button>
                <button className="btn-secondary" onClick={() => exportReportCSV(data)}>
                  <Icon name="download" /> {t('app.report.csv')}
                </button>
              </>
            )}
            <button className="btn-secondary" onClick={onClose}>
              {t('app.menu.close')}
            </button>
          </div>
        </header>
        {error && <p className="form-error">{error}</p>}
        {pdf.error && (
          <p className="form-error" role="alert">
            {pdf.error}
          </p>
        )}
        {!data && !error && <p>{t('app.common.loading')}</p>}
        {data && (
          <>
            <PeriodTable
              title={t('app.report.byMonth')}
              firstColumn={t('app.annual.table.month')}
              rows={data.months.map((m) => ({
                label: monthName(m.month),
                income: m.income,
                expenses: m.expenses,
                saving: m.saving,
                balance: m.income - m.expenses - m.saving,
              }))}
              total={data.totals}
            />
            <PeriodTable
              title={t('app.report.quarters')}
              firstColumn={t('app.report.quarter')}
              rows={data.quarters.map((q) => ({ ...q, label: `T${q.quarter}` }))}
            />
            <CategoryTable
              title={t('app.report.expensesByCategory')}
              rows={data.expensesByCategory}
            />
            <CategoryTable title={t('app.report.incomeByCategory')} rows={data.incomeByCategory} />
            <p className="report-note">{t('app.report.disclaimer')}</p>
          </>
        )}
      </div>
    </div>
  );
}
