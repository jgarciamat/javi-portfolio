import { FileDropZone } from '@shared/components/FileDropZone';
import { ScrollRegion } from '@shared/components/ScrollRegion';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Modal } from '@shared/components/Modal';
import type {
  Account,
  Category,
  ImportResult,
  TransactionType,
} from '@modules/finances/domain/types';
import type { BankId } from '@modules/finances/domain/bankFormats';
import { type ColumnMapping, rowType } from '@modules/finances/domain/importParsers';
import { TRANSACTION_TYPES, TYPE_LABEL_KEYS } from '@modules/finances/domain/transactionTypes';
import { useEffect, useRef, useState } from 'react';
import type { SharedContent } from '@core/share/sharedImport';
import { isImage, useImport } from '../../application/hooks/useImport';
import {
  AMOUNT_CLASS,
  EditableRows,
  type ImportSource,
  ImportSourceTabs,
  PastePanel,
  ScreenshotPanel,
} from './ImportSources';
import '../css/Sections.css';
import { Icon } from '@shared/components/Icon';
import { LeaksAfterImport } from './LeaksTeaser';
import { FirstResult } from './FirstResult';

interface ImportModalProps {
  accounts: Account[];
  /** After the import, a limit is offered for the category where most money went. */
  categories?: Category[];
  /** What another app shared with Finanverso: read as soon as the importer opens. */
  shared?: SharedContent | null;
  /** The tab it opens on, when nothing was shared. */
  initialSource?: ImportSource;
  onClose: () => void;
  onImported: () => void;
  /** Opens «Tu dinero perdido» (after an import it says what was found). */
  onOpenLeaks?: () => void;
  /** Opens the goals, to see when a goal is reached (after an import, if there are goals). */
  onOpenGoals?: () => void;
  /** Opens the budgets (after an import, next to the limit it suggests). */
  onOpenBudgets?: () => void;
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

/** Files keep their format's name; pasted text and screenshots are named in the person's language. */
const FORMAT_NAMES: Record<ImportState['format'], string> = {
  csv: 'CSV',
  norma43: 'Norma 43',
  pdf: 'PDF',
  text: 'app.import.source.paste',
  image: 'app.import.source.screenshot',
};
const editable = (imp: ImportState): boolean => imp.format === 'text' || imp.format === 'image';

const IMPORT_ACCEPT =
  '.csv,.xlsx,.pdf,.txt,.n43,.q43,.aeb,application/pdf,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*';

/** An image pasted with Ctrl/Cmd+V while the importer is open is read as a screenshot. */
function usePastedImage(onImage: (image: File) => void) {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const image = Array.from(event.clipboardData?.files ?? []).find(isImage);
      if (!image) return;
      event.preventDefault();
      onImage(image);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [onImage]);
}

/** The formats and how the category is chosen, for whoever wants the details. */
function FormatsHelp() {
  const { t } = useI18n();
  return (
    <details className="import-help">
      <summary>{t('app.import.help.title')}</summary>
      <p className="section-hint">{t('app.import.help.formats')}</p>
      <p className="section-hint">{t('app.import.help.categories')}</p>
    </details>
  );
}

function FilePanel({ imp }: { imp: ImportState }) {
  const { t } = useI18n();
  return (
    <>
      <p className="section-hint">{t('app.import.hint')}</p>
      <p className="section-hint">{t('app.leaks.importTip')}</p>
      <FormatsHelp />
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
    </>
  );
}

/** The first step: a statement file or the movements pasted from the bank's app. */
function FileStep({
  imp,
  shared,
  onShared,
  initialSource,
}: {
  imp: ImportState;
  shared: SharedContent | null;
  /** The shared content was read: starting again does not read it again. */
  onShared: () => void;
  initialSource: ImportSource;
}) {
  const [source, setSource] = useState<ImportSource>(() =>
    shared?.file && isImage(shared.file) ? 'screenshot' : shared?.text ? 'paste' : initialSource
  );
  const { loadFile, loadText } = imp;
  // What was shared is read once, when the importer opens.
  const sharedRead = useRef(false);
  useEffect(() => {
    if (!shared || sharedRead.current) return;
    sharedRead.current = true;
    onShared();
    if (shared.file) void loadFile(shared.file);
    else if (shared.text) loadText(shared.text);
  }, [shared, loadFile, loadText, onShared]);
  usePastedImage((image) => {
    setSource('screenshot');
    void loadFile(image);
  });
  // A file can be dropped on the whole step, whichever tab is open.
  return (
    <FileDropZone
      className="modal-body"
      accept={IMPORT_ACCEPT}
      onFiles={(list) => void imp.loadFile(list[0])}
    >
      <ImportSourceTabs source={source} onSource={setSource}>
        {source === 'file' && <FilePanel imp={imp} />}
        {source === 'paste' && (
          <PastePanel onRead={imp.loadText} initialText={shared?.text ?? ''} />
        )}
        {source === 'screenshot' && (
          <ScreenshotPanel reading={imp.reading} onImage={(image) => void imp.loadFile(image)} />
        )}
      </ImportSourceTabs>
    </FileDropZone>
  );
}

/** A column by its header, or by its place when it has none. */
const columnName = (headers: string[], index: number): string => headers[index] || `#${index + 1}`;

/** «Date: “Fecha valor” · Concept: “Concepto” · Amount: “Importe”»: what each column was taken as. */
function understoodColumns(
  imp: ImportState,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  return MAPPING_FIELDS.filter(({ key }) => imp.mapping[key] >= 0)
    .map(({ key, labelKey }) => `${t(labelKey)}: «${columnName(imp.headers, imp.mapping[key])}»`)
    .join(' · ');
}

/**
 * The columns of a CSV. When they were found, a line says how they were understood and the
 * selects wait folded under «Change columns»; when one is missing, they are open with the error.
 */
function ColumnMappingFields({ imp }: { imp: ImportState }) {
  const { t } = useI18n();
  const missing = missingColumns(imp.mapping);
  return (
    <>
      {missing.length === 0 && (
        <p className="section-success">
          <Icon name="checkCircle" />{' '}
          {t('app.import.columnsUnderstood', { columns: understoodColumns(imp, t) })}
        </p>
      )}
      <details className="import-columns" open={missing.length > 0}>
        <summary>{t('app.import.changeColumns')}</summary>
        <ColumnSelects imp={imp} missing={missing} />
      </details>
    </>
  );
}

function ColumnSelects({ imp, missing }: { imp: ImportState; missing: string[] }) {
  const { t } = useI18n();
  const { mapping } = imp;
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
              {imp.headers.map((_, i) => (
                <option key={i} value={i}>
                  {columnName(imp.headers, i)}
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

/** The rows read from a file, with the type of each one to correct. */
function ImportedRows({ imp }: { imp: ImportState }) {
  const { t } = useI18n();
  const { money, date } = useFormat();
  return (
    <ScrollRegion className="table-scroll import-rows-scroll" label={t('app.import.rowsList')}>
      <table className="data-table import-cards">
        <tbody>
          {imp.rows.map((r, i) => (
            <tr key={i}>
              <td className="import-card-date">{date(r.date)}</td>
              <td className="import-card-concept">{r.description}</td>
              <td className="import-card-meta">
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
              <td className={`import-card-amount ${r.amount < 0 ? 'amount-neg' : 'amount-pos'}`}>
                {money(r.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollRegion>
  );
}

function MappingStep({ imp, accounts }: { imp: ImportState; accounts: Account[] }) {
  const { t } = useI18n();
  return (
    <div className="modal-body">
      <p className="section-hint">
        {imp.fileName && `${imp.fileName} · `}
        {editable(imp) ? t(FORMAT_NAMES[imp.format]) : FORMAT_NAMES[imp.format]} ·{' '}
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
      {editable(imp) ? (
        <EditableRows
          rows={imp.rows}
          review={imp.review}
          onEdit={imp.editRow}
          onType={imp.setRowType}
          onRemove={imp.removeRow}
        />
      ) : (
        <ImportedRows imp={imp} />
      )}
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

/**
 * «Already covered by an automatic operation»: the row repeats a movement one of them added. Left
 * out unless the person ticks «Import it anyway».
 */
function CoveredRow({ row, imp }: { row: ImportedRow; imp: ImportState }) {
  const { t } = useI18n();
  const { date } = useFormat();
  const cover = row.coveredBy as NonNullable<ImportedRow['coveredBy']>;
  return (
    <span className="import-covered">
      <small>{t('app.import.covered', { name: cover.description, date: date(cover.date) })}</small>
      <label>
        <input
          type="checkbox"
          checked={!imp.omitted.includes(row.index)}
          onChange={() => imp.toggleOmitted(row.index)}
        />{' '}
        {t('app.import.importAnyway')}
        <span className="sr-only"> {row.description}</span>
      </label>
    </span>
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
  const covered = preview.rows.filter((r) => r.coveredBy).length;
  const toImport = preview.imported - imp.omitted.length;
  const left = (r: ImportedRow) => r.status !== 'imported' || imp.omitted.includes(r.index);

  return (
    <div className="modal-body">
      <p className="section-hint">
        {t('app.import.previewSummary', {
          imported: preview.imported,
          duplicates: preview.duplicates,
          invalid: preview.invalid,
        })}
      </p>
      {covered > 0 && (
        <p className="plan-note" role="status">
          <Icon name="repeat" />{' '}
          {t(covered === 1 ? 'app.import.coveredNoticeOne' : 'app.import.coveredNotice', {
            count: covered,
          })}
        </p>
      )}
      <ScrollRegion className="table-scroll" label={t('app.import.preview')}>
        {/* On phones each row is a card: concept and amount whole, the category under them. */}
        <table className="data-table import-cards">
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
              <tr key={r.index} className={left(r) ? 'row-muted' : undefined}>
                <td className="import-card-date">{r.date ? date(r.date) : '—'}</td>
                <td className="import-card-concept">{r.description ?? r.error}</td>
                <td className="import-card-type">{r.type ? <TypeBadge type={r.type} /> : '—'}</td>
                <td className={`import-card-amount ${r.type ? AMOUNT_CLASS[r.type] : ''}`}>
                  {amount(r)}
                </td>
                <td className="import-card-meta">
                  {category(r)}
                  {r.coveredBy && <CoveredRow row={r} imp={imp} />}
                </td>
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
          disabled={imp.busy || toImport === 0}
          onClick={imp.confirmImport}
        >
          {imp.busy ? t('app.common.loading') : t('app.import.confirm', { count: toImport })}
        </button>
      </div>
    </div>
  );
}

/** What the import left, and the next steps: a limit for the biggest expense, the charges that repeat, the leaks. */
function DoneStep({
  result,
  rows,
  categories,
  onOpenLeaks,
  onOpenGoals,
  onOpenBudgets,
}: {
  result: ImportResult;
  categories: Category[];
  /** The rows of the preview: what was imported, with its category. */
  rows: ImportResult['rows'];
  onOpenLeaks?: () => void;
  onOpenGoals?: () => void;
  onOpenBudgets?: () => void;
}) {
  const { t } = useI18n();
  const one = result.imported === 1;
  return (
    <div className="modal-body import-done">
      <h3 className="import-done-title">
        <Icon name="checkCircle" />{' '}
        {t(one ? 'app.import.doneTitleOne' : 'app.import.doneTitle', { count: result.imported })}
      </h3>
      {result.duplicates > 0 && (
        <p className="section-hint">
          {t('app.import.doneDuplicates', { count: result.duplicates })}
        </p>
      )}
      {result.imported > 0 && (
        <>
          <p className="section-hint">{t('app.import.doneNext')}</p>
          <FirstResult
            rows={rows}
            categories={categories}
            onOpenGoals={onOpenGoals}
            onOpenBudgets={onOpenBudgets}
          />
          {onOpenLeaks && <LeaksAfterImport onOpen={onOpenLeaks} />}
        </>
      )}
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
          {t(editable(imp) ? 'app.import.otherSource' : 'app.import.otherFile')}
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
function StepBody({
  imp,
  accounts,
  onOpenLeaks,
  onOpenGoals,
  shared,
  onShared,
  initialSource,
  onOpenBudgets,
  categories,
}: {
  imp: ImportState;
  accounts: Account[];
  categories: Category[];
  onOpenLeaks?: () => void;
  onOpenGoals?: () => void;
  onOpenBudgets?: () => void;
  shared: SharedContent | null;
  onShared: () => void;
  initialSource: ImportSource;
}) {
  if (imp.step === 'mapping') return <MappingStep imp={imp} accounts={accounts} />;
  if (imp.step === 'preview' && imp.preview) return <PreviewStep imp={imp} preview={imp.preview} />;
  if (imp.step === 'done' && imp.result) {
    return (
      <DoneStep
        result={imp.result}
        rows={(imp.preview as ImportResult).rows.filter((r) => !imp.omitted.includes(r.index))}
        categories={categories}
        onOpenLeaks={onOpenLeaks}
        onOpenGoals={onOpenGoals}
        onOpenBudgets={onOpenBudgets}
      />
    );
  }
  return <FileStep imp={imp} shared={shared} onShared={onShared} initialSource={initialSource} />;
}

/** Bank statement import: choose file → map columns → preview → import. */
export function ImportModal({
  accounts,
  categories = [],
  shared: sharedContent = null,
  initialSource = 'file',
  onClose,
  onImported,
  onOpenLeaks,
  onOpenGoals,
  onOpenBudgets,
}: ImportModalProps) {
  const { t } = useI18n();
  const [shared, setShared] = useState(sharedContent);
  const activeAccounts = accounts.filter((a) => !a.archived);
  const imp = useImport(onImported, defaultAccountId(activeAccounts));

  return (
    <Modal
      label={t('app.import.title')}
      onClose={onClose}
      dismissible={!imp.busy && !imp.reading}
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
      <StepBody
        imp={imp}
        accounts={activeAccounts}
        onOpenLeaks={onOpenLeaks}
        onOpenGoals={onOpenGoals}
        onOpenBudgets={onOpenBudgets}
        categories={categories}
        shared={shared}
        onShared={() => setShared(null)}
        initialSource={initialSource}
      />
      {imp.error && <p className="form-error">{t(imp.error)}</p>}
      {imp.step !== 'preview' && <Footer imp={imp} onClose={onClose} />}
    </Modal>
  );
}
