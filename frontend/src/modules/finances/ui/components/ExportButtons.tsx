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
  /**
   * Why the buttons are off as a tooltip of the group (on hover, or on focus: the group can be
   * reached with the keyboard while they are off) instead of a line of text beside them.
   */
  tooltip?: boolean;
}

/** Why the buttons are off: a line of text, or the tooltip of the group. */
function EmptyHint({ id, tooltip }: { id: string; tooltip?: boolean }) {
  const { t } = useI18n();
  return tooltip ? (
    <span id={id} className="export-tip" role="tooltip">
      {t('app.exportButtons.empty')}
    </span>
  ) : (
    <span id={id} className="export-empty">
      {t('app.exportButtons.empty')}
    </span>
  );
}

/**
 * The class of the group and, with the tooltip and nothing to export, the focus and the
 * description that say why the buttons are off.
 */
function groupProps(tooltip: boolean | undefined, empty: boolean, emptyId: string) {
  if (!tooltip) return { className: 'export-buttons' };
  const why = empty ? { tabIndex: 0, 'aria-describedby': emptyId } : {};
  return { className: 'export-buttons export-buttons--tip', ...why };
}

/** The same export buttons on every screen with a table: CSV, and PDF where it reads as a table. */
export function ExportButtons({ name, what, count, table, pdf, tooltip }: ExportButtonsProps) {
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
    <div
      role="group"
      aria-label={t('app.exportButtons.group')}
      {...groupProps(tooltip, empty, emptyId)}
    >
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
      {empty && <EmptyHint id={emptyId} tooltip={tooltip} />}
      {action.error && (
        <p className="form-error" role="alert">
          {action.error}
        </p>
      )}
    </div>
  );
}
