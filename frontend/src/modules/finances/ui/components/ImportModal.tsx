import { FileDropZone } from '@shared/components/FileDropZone';
import { ScrollRegion } from '@shared/components/ScrollRegion';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Modal } from '@shared/components/Modal';
import type { Account, ImportResult, TransactionType } from '@modules/finances/domain/types';
import type { BankId } from '@modules/finances/domain/bankFormats';
import { type ColumnMapping, rowType } from '@modules/finances/domain/importParsers';
import { TRANSACTION_TYPES, TYPE_LABEL_KEYS } from '@modules/finances/domain/transactionTypes';
import { useImport } from '../../application/hooks/useImport';
import '../css/Sections.css';
import { Icon } from '@shared/components/Icon';

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
  { key: 'type', labelKey: 'app.import.col.type', optional: true },
  { key: 'notes', labelKey: 'app.import.col.notes', optional: true },
];

/** Gasto red, Ingreso green, Ahorro blue. */
const TYPE_BADGE: Record<TransactionType, string> = {
  EXPENSE: 'tx-badge tx-badge-expense',
  INCOME: 'tx-badge tx-badge-income',
  SAVING: 'tx-badge import-badge-saving',
};

const typeName = (t: (key: string) => string, type: TransactionType): string =>
  t(TYPE_LABEL_KEYS[type]).replace(/^[↑↓]\s*/, '');

function TypeBadge({ type }: { type: TransactionType }) {
  const { t } = useI18n();
  return <span className={TYPE_BADGE[type]}>{typeName(t, type)}</span>;
}

const BANK_NAMES: Record<BankId, string> = {
  caixabank: 'CaixaBank',
  bbva: 'BBVA',
  santander: 'Santander',
  ing: 'ING',
  revolut: 'Revolut',
};

/** How the category was chosen: "?" = fallback, ✨ = suggested by the AI, 📌 = your own rule. */
const SOURCE_MARK: Partial<Record<NonNullable<ImportedRow['categorySource']>, string>> = {
  rule: ' 📌',
  fallback: ' ?',
  ai: ' ✨',
};

/** A CSV with the columns the import expects, and invented movements, to fill in. */
const TEMPLATE_HREF = '/plantillas/movimientos.csv';

/** The movements template, with the columns it has. */
function TemplateLink() {
  const { t } = useI18n();
  return (
    <p className="section-hint import-template">
      {t('app.import.template.columns')}{' '}
      <a
        className="btn-secondary import-template-link"
        href={TEMPLATE_HREF}
        download
        aria-label={t('app.import.template.downloadAria')}
      >
        <Icon name="download" /> {t('app.import.template.download')}
      </a>
    </p>
  );
}

/** The columns a CSV must have that could not be found (an amount, or a debit and a credit). */
function missingColumns(mapping: ColumnMapping): string[] {
  const missing: string[] = [];
  if (mapping.date < 0) missing.push('app.import.col.date');
  if (mapping.description < 0) missing.push('app.import.col.description');
  if (mapping.amount < 0 && mapping.debit < 0 && mapping.credit < 0)
    missing.push('app.import.col.amount');
  return missing;
}

const FORMAT_NAMES = { csv: 'CSV', norma43: 'Norma 43', pdf: 'PDF' } as const;

const IMPORT_ACCEPT =
  '.csv,.xlsx,.pdf,.txt,.n43,.q43,.aeb,application/pdf,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function FileStep({ imp }: { imp: ImportState }) {
  const { t } = useI18n();
  return (
    <FileDropZone
      className="modal-body"
      accept={IMPORT_ACCEPT}
      onFiles={(list) => void imp.loadFile(list[0])}
    >
      <p className="section-hint">{t('app.import.hint')}</p>
      <TemplateLink />
      <label className="file-drop">
        <input
          type="file"
          accept={IMPORT_ACCEPT}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void imp.loadFile(file);
          }}
        />
        <span>{t('app.import.choose')}</span>
      </label>
    </FileDropZone>
  );
}

function ColumnMappingFields({ imp }: { imp: ImportState }) {
  const { t } = useI18n();
  const { mapping } = imp;
  const missing = missingColumns(mapping);
  return (
    <>
      {missing.length > 0 && (
        <div className="form-error" role="alert">
          <p>
            {t('app.import.error.columns', {
              missing: missing.map((key) => t(key)).join(', '),
              found: imp.headers.filter(Boolean).join(', '),
            })}
          </p>
          <TemplateLink />
        </div>
      )}
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
    </>
  );
}

/** What the person should know about a PDF statement before importing it. */
function PdfNotes({ imp }: { imp: ImportState }) {
  const { t } = useI18n();
  return (
    <>
      <p className="section-success">
        <Icon name="checkCircle" />{' '}
        {imp.pdfBank ? t('app.import.pdfBank', { bank: imp.pdfBank }) : t('app.import.pdfGeneric')}
      </p>
      {imp.balanceMismatches > 0 && (
        <p className="form-error" role="alert">
          {t('app.import.pdfBalance', { count: imp.balanceMismatches })}
        </p>
      )}
    </>
  );
}

function MappingStep({ imp, accounts }: { imp: ImportState; accounts: Account[] }) {
  const { t } = useI18n();
  const { money, date } = useFormat();
  return (
    <div className="modal-body">
      <p className="section-hint">
        {imp.fileName} · {FORMAT_NAMES[imp.format]} ·{' '}
        {t('app.import.rowsFound', { count: imp.rows.length })}
        {imp.skipped.length > 0 &&
          ` · ${t('app.import.rowsSkipped', { count: imp.skipped.length })}`}
      </p>
      {imp.bank && (
        <p className="section-success">
          <Icon name="checkCircle" /> {t('app.import.bankDetected', { bank: BANK_NAMES[imp.bank] })}
        </p>
      )}
      {imp.format === 'pdf' && <PdfNotes imp={imp} />}
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
      <label className="setting-row">
        <span>
          <strong>{t('app.import.useAi')}</strong>
          <small>{t('app.import.useAiHint')}</small>
        </span>
        <input
          type="checkbox"
          className="toggle"
          checked={imp.useAi}
          onChange={(e) => imp.setUseAi(e.target.checked)}
        />
      </label>
      <ScrollRegion className="table-scroll import-rows-scroll" label={t('app.import.rowsList')}>
        <table className="data-table">
          <tbody>
            {imp.rows.map((r, i) => (
              <tr key={i}>
                <td>{date(r.date)}</td>
                <td>{r.description}</td>
                <td>
                  <select
                    className="tx-input import-type-select"
                    aria-label={`${t('app.import.col.type')} ${r.description}`}
                    value={rowType(r)}
                    onChange={(e) => imp.setRowType(i, e.target.value as TransactionType)}
                  >
                    {TRANSACTION_TYPES.map((ty) => (
                      <option key={ty} value={ty}>
                        {typeName(t, ty)}
                      </option>
                    ))}
                  </select>
                  {imp.review.includes(i) && (
                    <small className="import-review"> {t('app.import.typeReview')}</small>
                  )}
                </td>
                <td className={r.amount < 0 ? 'amount-neg' : 'amount-pos'}>{money(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
      {imp.skipped.length > 0 && (
        <ScrollRegion className="import-skipped-scroll" label={t('app.import.skippedLines')}>
          <small>
            {t('app.import.skippedLines')}: {imp.skipped.join(', ')}
          </small>
        </ScrollRegion>
      )}
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
    r.amount === undefined ? '—' : money(r.type === 'EXPENSE' ? -r.amount : r.amount);

  return (
    <div className="modal-body">
      <p className="section-hint">
        {t('app.import.previewSummary', {
          imported: preview.imported,
          duplicates: preview.duplicates,
          invalid: preview.invalid,
        })}
      </p>
      <ScrollRegion className="table-scroll" label={t('app.import.preview')}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('app.import.col.date')}</th>
              <th>{t('app.import.col.description')}</th>
              <th>{t('app.import.col.type')}</th>
              <th>{t('app.import.col.amount')}</th>
              <th>{t('app.import.col.category')}</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.slice(0, 100).map((r) => (
              <tr key={r.index} className={r.status !== 'imported' ? 'row-muted' : undefined}>
                <td>{r.date ? date(r.date) : '—'}</td>
                <td>{r.description ?? r.error}</td>
                <td>{r.type ? <TypeBadge type={r.type} /> : '—'}</td>
                <td>{amount(r)}</td>
                <td>{category(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
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
        <Icon name="checkCircle" />{' '}
        {t('app.import.done', { imported: result.imported, duplicates: result.duplicates })}
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
        <h2 className="modal-title">
          <Icon name="upload" /> {t('app.import.title')}
        </h2>
        <button className="modal-close" onClick={onClose} aria-label={t('app.common.close')}>
          <Icon name="close" />
        </button>
      </div>
      <StepBody imp={imp} accounts={activeAccounts} />
      {imp.error && <p className="form-error">{t(imp.error)}</p>}
      {imp.step !== 'preview' && <Footer imp={imp} onClose={onClose} />}
    </Modal>
  );
}
