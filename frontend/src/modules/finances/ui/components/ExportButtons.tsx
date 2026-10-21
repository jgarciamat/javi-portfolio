import { useId } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { useAction } from '@shared/hooks/useAction';
import { exportRowsCSV } from '../../application/hooks/useExportCSV';
import { useTablePdf } from '../../application/hooks/useTablePdf';
import type { PdfTable } from '../../application/tablePdf';
import '../css/ExportButtons.css';

interface ExportButtonsProps {
  /** Stem of the file name: `finanverso_<name>_<today>.csv` (and `.pdf`). */
  name: string;
  /** What is exported, read out with the button ("Exportar CSV: Cuentas"). */
  what: string;
  /** How many rows there are: with none the button is off and says why. */
  count: number;
  /** Builds the table when pressed (it may have to load every page first). */
  table: () => PdfTable | Promise<PdfTable>;
  /**
   * Also a PDF of the same table, titled `what` (free on every plan). `range` is the period the
   * rows are about, printed under the title.
   */
  pdf?: boolean | { range?: string };
}

/** The same export buttons on every screen with a table: CSV, and PDF where it reads as a table. */
export function ExportButtons({ name, what, count, table, pdf }: ExportButtonsProps) {
  const { t, locale } = useI18n();
  const action = useAction(t('app.exportButtons.error'));
  const { downloadTablePdf } = useTablePdf();
  const emptyId = useId();
  const empty = count === 0;

  const exportCSV = () =>
    action.run(async () => exportRowsCSV(name, await table(), locale === 'en' ? '.' : ','));
  const range = typeof pdf === 'object' ? pdf.range : undefined;
  const exportPdf = () =>
    action.run(async () => downloadTablePdf(name, await table(), what, range));

  return (
    <div className="export-buttons" role="group" aria-label={t('app.exportButtons.group')}>
      <button
        type="button"
        className="btn-secondary export-button"
        disabled={empty || action.pending}
        aria-label={t('app.exportButtons.csvFor', { what })}
        aria-describedby={empty ? emptyId : undefined}
        onClick={() => void exportCSV()}
      >
        <Icon name="download" /> {t('app.exportButtons.csv')}
      </button>
      {pdf && (
        <button
          type="button"
          className="btn-secondary export-button"
          disabled={empty || action.pending}
          aria-label={t('app.exportButtons.pdfFor', { what })}
          aria-describedby={empty ? emptyId : undefined}
          onClick={() => void exportPdf()}
        >
          <Icon name="file" /> {t('app.exportButtons.pdf')}
        </button>
      )}
      {empty && (
        <span id={emptyId} className="export-empty">
          {t('app.exportButtons.empty')}
        </span>
      )}
      {action.error && (
        <p className="form-error" role="alert">
          {action.error}
        </p>
      )}
    </div>
  );
}
