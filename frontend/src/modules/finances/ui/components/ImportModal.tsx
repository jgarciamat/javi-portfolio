import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Modal } from '@shared/components/Modal';
import type { Account, ImportResult } from '@modules/finances/domain/types';
import type { ColumnMapping } from '@modules/finances/domain/importParsers';
import { useImport } from '../../application/hooks/useImport';
import '../css/Sections.css';

interface ImportModalProps {
  accounts: Account[];
  onClose: () => void;
  onImported: () => void;
}

type ImportState = ReturnType<typeof useImport>;
type ImportedRow = ImportResult['rows'][number];

const MAPPING_FIELDS: { key: keyof ColumnMapping; labelKey: string; optional?: boolean }[] = [
  { key: 'date', labelKey: 'app.import.col.date' },
  { key: 'description', labelKey: 'app.import.col.description' },
  { key: 'amount', labelKey: 'app.import.col.amount', optional: true },
  { key: 'debit', labelKey: 'app.import.col.debit', optional: true },
  { key: 'credit', labelKey: 'app.import.col.credit', optional: true },
  { key: 'category', labelKey: 'app.import.col.category', optional: true },
];

/** How the category was chosen: "?" = fallback, ✨ = suggested by the AI. */
const SOURCE_MARK: Partial<Record<NonNullable<ImportedRow['categorySource']>, string>> = {
  fallback: ' ?',
  ai: ' ✨',
};

function FileStep({ imp }: { imp: ImportState }) {
  const { t } = useI18n();
  return (
    <div className="modal-body">
      <p className="section-hint">{t('app.import.hint')}</p>
      <label className="file-drop">
        <input
          type="file"
          accept=".csv,.txt,.n43,.q43,.aeb,text/csv,text/plain"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void imp.loadFile(file);
          }}
        />
        <span>{t('app.import.choose')}</span>
      </label>
    </div>
  );
}

function ColumnMappingFields({ imp }: { imp: ImportState }) {
  const { t } = useI18n();
  const { mapping } = imp;
  return (
    <div className="form-grid">
      {MAPPING_FIELDS.map(({ key, labelKey, optional }) => (
        <label key={key} className="field">
          <span className="field-label">{t(labelKey)}</span>
          <select
            className="tx-input"
            value={mapping[key]}
            onChange={(e) => imp.updateMapping(key, Number(e.target.value))}
          >
            {optional && <option value={-1}>—</option>}
            {imp.headers.map((h, i) => (
              <option key={i} value={i}>
                {h || `#${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function MappingStep({ imp, accounts }: { imp: ImportState; accounts: Account[] }) {
  const { t } = useI18n();
  const { money, date } = useFormat();
  return (
    <div className="modal-body">
      <p className="section-hint">
        {imp.fileName} · {imp.format === 'norma43' ? 'Norma 43' : 'CSV'} ·{' '}
        {t('app.import.rowsFound', { count: imp.rows.length })}
        {imp.skipped.length > 0 &&
          ` · ${t('app.import.rowsSkipped', { count: imp.skipped.length })}`}
      </p>
      {imp.format === 'csv' && <ColumnMappingFields imp={imp} />}
      {accounts.length > 1 && (
        <label className="field">
          <span className="field-label">{t('app.transaction.form.account')}</span>
          <select
            className="tx-input"
            value={imp.accountId}
            onChange={(e) => imp.setAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <table className="data-table">
        <tbody>
          {imp.rows.slice(0, 5).map((r, i) => (
            <tr key={i}>
              <td>{date(r.date)}</td>
              <td>{r.description}</td>
              <td className={r.amount < 0 ? 'amount-neg' : 'amount-pos'}>{money(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewStep({ imp, preview }: { imp: ImportState; preview: ImportResult }) {
  const { t, tCategory } = useI18n();
  const { money, date } = useFormat();
  const category = (r: ImportedRow): string =>
    r.status === 'imported'
      ? `${tCategory(r.categoryName ?? '')}${SOURCE_MARK[r.categorySource ?? 'file'] ?? ''}`
      : t(`app.import.status.${r.status}`);
  const amount = (r: ImportedRow): string =>
    r.amount === undefined ? '—' : money(r.type === 'INCOME' ? r.amount : -r.amount);

  return (
    <div className="modal-body">
      <p className="section-hint">
        {t('app.import.previewSummary', {
          imported: preview.imported,
          duplicates: preview.duplicates,
          invalid: preview.invalid,
        })}
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('app.import.col.date')}</th>
              <th>{t('app.import.col.description')}</th>
              <th>{t('app.import.col.amount')}</th>
              <th>{t('app.import.col.category')}</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.slice(0, 100).map((r) => (
              <tr key={r.index} className={r.status !== 'imported' ? 'row-muted' : undefined}>
                <td>{r.date ? date(r.date) : '—'}</td>
                <td>{r.description ?? r.error}</td>
                <td>{amount(r)}</td>
                <td>{category(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={imp.back}>
          {t('app.common.back')}
        </button>
        <button
          className="btn-primary"
          disabled={imp.busy || preview.imported === 0}
          onClick={imp.confirmImport}
        >
          {imp.busy
            ? t('app.common.loading')
            : t('app.import.confirm', { count: preview.imported })}
        </button>
      </div>
    </div>
  );
}

function DoneStep({ result }: { result: ImportResult }) {
  const { t } = useI18n();
  return (
    <div className="modal-body">
      <p className="section-success">
        ✅ {t('app.import.done', { imported: result.imported, duplicates: result.duplicates })}
      </p>
    </div>
  );
}

function Footer({ imp, onClose }: { imp: ImportState; onClose: () => void }) {
  const { t } = useI18n();
  const busy = t('app.common.loading');
  if (imp.step === 'mapping') {
    return (
      <div className="modal-footer">
        <button className="btn-secondary" onClick={imp.reset}>
          {t('app.import.otherFile')}
        </button>
        <button
          className="btn-primary"
          disabled={imp.busy || imp.rows.length === 0}
          onClick={imp.previewImport}
        >
          {imp.busy ? busy : t('app.import.preview')}
        </button>
      </div>
    );
  }
  return (
    <div className="modal-footer">
      <button className="btn-secondary" onClick={onClose}>
        {t('app.common.close')}
      </button>
    </div>
  );
}

/** The default account, else the first active one. */
function defaultAccountId(accounts: Account[]): string | null {
  const account = accounts.find((a) => a.isDefault) ?? accounts[0];
  return account ? account.id : null;
}

/** Body of the current step (the preview step renders its own buttons). */
function StepBody({ imp, accounts }: { imp: ImportState; accounts: Account[] }) {
  if (imp.step === 'mapping') return <MappingStep imp={imp} accounts={accounts} />;
  if (imp.step === 'preview' && imp.preview) return <PreviewStep imp={imp} preview={imp.preview} />;
  if (imp.step === 'done' && imp.result) return <DoneStep result={imp.result} />;
  return <FileStep imp={imp} />;
}

/** Bank statement import: choose file → map columns → preview → import. */
export function ImportModal({ accounts, onClose, onImported }: ImportModalProps) {
  const { t } = useI18n();
  const activeAccounts = accounts.filter((a) => !a.archived);
  const imp = useImport(onImported, defaultAccountId(activeAccounts));

  return (
    <Modal
      label={t('app.import.title')}
      onClose={onClose}
      dismissible={!imp.busy}
      className="modal-panel modal-panel--wide"
    >
      <div className="modal-header">
        <h2 className="modal-title">📤 {t('app.import.title')}</h2>
        <button className="modal-close" onClick={onClose} aria-label={t('app.common.close')}>
          ✕
        </button>
      </div>
      <StepBody imp={imp} accounts={activeAccounts} />
      {imp.error && <p className="form-error">{t(imp.error)}</p>}
      {imp.step !== 'preview' && <Footer imp={imp} onClose={onClose} />}
    </Modal>
  );
}
