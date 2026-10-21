import { useId } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { useAction } from '@shared/hooks/useAction';
import { exportRowsCSV, type CsvTable } from '../../application/hooks/useExportCSV';
import '../css/ExportButtons.css';

interface ExportButtonsProps {
  /** Stem of the file name: `finanverso_<name>_<today>.csv`. */
  name: string;
  /** What is exported, read out with the button ("Exportar CSV: Cuentas"). */
  what: string;
  /** How many rows there are: with none the button is off and says why. */
  count: number;
  /** Builds the table when pressed (it may have to load every page first). */
  table: () => CsvTable | Promise<CsvTable>;
  /** PDF of the same table, when the screen has one. */
  onPdf?: () => void;
}

/** The same export buttons on every screen with a table: CSV now, PDF where it exists. */
export function ExportButtons({ name, what, count, table, onPdf }: ExportButtonsProps) {
  const { t, locale } = useI18n();
  const action = useAction(t('app.exportButtons.error'));
  const emptyId = useId();
  const empty = count === 0;

  const exportCSV = () =>
    action.run(async () => exportRowsCSV(name, await table(), locale === 'en' ? '.' : ','));

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
      {onPdf && (
        <button
          type="button"
          className="btn-secondary export-button"
          disabled={empty}
          aria-label={t('app.exportButtons.pdfFor', { what })}
          onClick={onPdf}
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
