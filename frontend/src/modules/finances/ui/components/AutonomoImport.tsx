import { useRef, useState, type DragEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { storage } from '@shared/utils/storage';
import { detectBooks, type BookKind } from '../../domain/invoiceBook';
import { dropInvoices, type KindPreferences } from '../../domain/invoiceLedger';
import { bookOf, type InvoicePdf, type Me } from '../../domain/invoicePdf';
import { readSpreadsheet, SpreadsheetError } from '../../application/spreadsheet';
import { readImportPdf, type ImportPdf } from '../../application/taxModelPdf';
import { applyChanged, KIND_PREFERENCES_KEY, ME_KEY } from './importForm';
import {
  importBook,
  importInvoicePdf,
  importModel,
  type Applied,
  type Line,
  type Sheets,
} from './importFiles';
import type { ManualForm } from './AutonomoManual';

type Quarter = 1 | 2 | 3 | 4;

/** How a file ended, for the summary of a drop of many. */
type Outcome = 'added' | 'review' | 'ask' | 'again' | 'error' | 'other';

/**
 * What happened to each file. `ask` keeps the sheets until the person says which book they are;
 * `askPdf` does the same for an invoice in PDF, and `change` lets them move one taken as an expense.
 */
interface FileResult {
  id: number;
  name: string;
  lines: Line[];
  outcome: Outcome;
  ask?: Sheets;
  askPdf?: InvoicePdf;
  change?: { invoice: InvoicePdf; ids: string[] };
  ids?: string[];
}

type Answer = Omit<FileResult, 'id' | 'name'>;

const TEMPLATES = [
  ['issued', '/plantillas/facturas-emitidas.xlsx'],
  ['received', '/plantillas/facturas-recibidas.xlsx'],
  ['130', '/plantillas/modelo-130-plantilla.pdf'],
  ['303', '/plantillas/modelo-303-plantilla.pdf'],
  ['349', '/plantillas/modelo-349-plantilla.pdf'],
  ['390', '/plantillas/modelo-390-plantilla.pdf'],
  ['111', '/plantillas/modelo-111-plantilla.pdf'],
  ['115', '/plantillas/modelo-115-plantilla.pdf'],
] as const;

const isPdf = (file: File) => /\.pdf$/i.test(file.name) || file.type === 'application/pdf';

/** The templates, each a download link. */
function TemplateLinks() {
  const { t } = useI18n();
  return (
    <div className="autonomo-templates">
      <span>{t('app.autonomo.import.template')}:</span>
      {TEMPLATES.map(([what, href]) => (
        <a
          key={what}
          className="btn-secondary"
          href={href}
          download
          aria-label={`${t('app.autonomo.import.template')}: ${t(
            `app.autonomo.import.templateOf.${what}`
          )}`}
        >
          {t(`app.autonomo.import.templateOf.${what}`)}
        </a>
      ))}
    </div>
  );
}

/** A line of a result with its money, dates and review reasons said in the person's language. */
function useLineText() {
  const { t } = useI18n();
  const { money, date } = useFormat();
  return (line: Line) =>
    t(line.key, {
      ...line.values,
      ...Object.fromEntries(Object.entries(line.money ?? {}).map(([k, v]) => [k, money(v)])),
      ...Object.fromEntries(
        Object.entries(line.dates ?? {}).map(([k, v]) => [
          k,
          v ? date(v) : t('app.autonomo.pdf.noDate'),
        ])
      ),
      ...(line.reasons
        ? { reasons: line.reasons.map((r) => t(`app.autonomo.pdf.reason.${r}`)).join(' · ') }
        : {}),
    });
}

/** Two buttons: is the file what the person billed, or what they were billed? */
function AskBook({
  label,
  question,
  answers,
  onAnswer,
}: {
  label: string;
  question: string;
  answers: Record<BookKind, string>;
  onAnswer: (kind: BookKind) => void;
}) {
  return (
    <div role="group" aria-label={label}>
      <p>{question}</p>
      <div className="autonomo-import-actions">
        {(['received', 'issued'] as const).map((kind) => (
          <button key={kind} type="button" className="btn-secondary" onClick={() => onAnswer(kind)}>
            {answers[kind]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** What each file gave, and the question for a book or an invoice that does not say which it is. */
function FileResults({
  results,
  onAnswer,
  onAnswerPdf,
  onChangeBook,
  onShow,
}: {
  results: FileResult[];
  onAnswer: (result: FileResult, kind: BookKind) => void;
  onAnswerPdf: (result: FileResult, kind: BookKind) => void;
  onChangeBook: (result: FileResult) => void;
  onShow?: (id: string) => void;
}) {
  const { t } = useI18n();
  const text = useLineText();
  return (
    <ul className="autonomo-import-files" aria-label={t('app.autonomo.import.results')}>
      {results.map((r) => (
        <li key={r.id} className="autonomo-import-file">
          <strong>{r.name}</strong>
          {r.ask && (
            <AskBook
              label={t('app.autonomo.import.askLabel', { file: r.name })}
              question={t('app.autonomo.import.ask')}
              answers={{
                issued: t('app.autonomo.import.are.issued'),
                received: t('app.autonomo.import.are.received'),
              }}
              onAnswer={(kind) => onAnswer(r, kind)}
            />
          )}
          {r.askPdf && (
            <AskBook
              label={t('app.autonomo.pdf.askLabel', { file: r.name })}
              question={t('app.autonomo.pdf.ask')}
              answers={{
                issued: t('app.autonomo.pdf.is.issued'),
                received: t('app.autonomo.pdf.is.received'),
              }}
              onAnswer={(kind) => onAnswerPdf(r, kind)}
            />
          )}
          {r.lines.map((line, i) =>
            line.tone === 'error' ? (
              <p key={i} className="inline-error" role="alert">
                {text(line)}
              </p>
            ) : (
              <p
                key={i}
                className={line.tone === 'note' ? 'section-hint' : undefined}
                role={line.tone === 'done' ? 'status' : undefined}
              >
                {text(line)}
              </p>
            )
          )}
          {(r.ids || r.change) && (
            <div className="autonomo-import-actions">
              {r.ids && onShow && (
                <button
                  type="button"
                  className="btn-secondary"
                  aria-label={t('app.autonomo.pdf.showOf', { file: r.name })}
                  onClick={() => onShow((r.ids as string[])[0])}
                >
                  {t('app.autonomo.pdf.show')}
                </button>
              )}
              {r.change && (
                <button
                  type="button"
                  className="btn-secondary"
                  aria-label={t('app.autonomo.pdf.mineOf', { file: r.name })}
                  onClick={() => onChangeBook(r)}
                >
                  {t('app.autonomo.pdf.mine')}
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const SUMMARY: Outcome[] = ['added', 'review', 'again', 'ask', 'error'];

/** How a drop of many files went, in one line. */
function Summary({ results }: { results: FileResult[] }) {
  const { t } = useI18n();
  const parts = SUMMARY.map((o) => [o, results.filter((r) => r.outcome === o).length] as const)
    .filter(([, n]) => n > 0)
    .map(([o, n]) => t(`app.autonomo.import.summary.${o}`, { n }));
  // Books and modelos say what they did on their own line: the summary is about invoices.
  if (parts.length === 0) return null;
  return (
    <p className="autonomo-import-summary">
      {t('app.autonomo.import.summary.title', { n: results.length })} {parts.join(' · ')}
    </p>
  );
}

/** The person as the app knows them from their issued invoices, with a way to forget it. */
function KnownMe({ me, onForget }: { me: Me; onForget: () => void }) {
  const { t } = useI18n();
  const who = [me.name, me.nif].filter(Boolean).join(' · ');
  return (
    <p className="section-hint autonomo-import-me">
      {t('app.autonomo.pdf.me', { who })}{' '}
      <button type="button" className="btn-secondary" onClick={onForget}>
        {t('app.autonomo.pdf.forget')}
      </button>
    </p>
  );
}

/** The zone where files are dropped, with the button to choose them. */
function DropZone({ busy, onFiles }: { busy: boolean; onFiles: (files: File[]) => void }) {
  const { t } = useI18n();
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const drop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    onFiles(Array.from(e.dataTransfer.files));
  };
  return (
    <div
      className={`autonomo-drop${dragging ? ' is-dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        // Moving over a child of the zone is not leaving it.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={drop}
    >
      <p className="autonomo-drop-text">{t('app.autonomo.import.drop')}</p>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept=".xlsx,.xlsm,.csv,.txt,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-label={t('app.autonomo.import.files')}
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          e.target.value = '';
          onFiles(picked);
        }}
      />
      <button
        type="button"
        className="btn-primary"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? t('app.autonomo.import.reading') : t('app.autonomo.import.choose')}
      </button>
      <small className="section-hint">{t('app.autonomo.import.accepts')}</small>
    </div>
  );
}

/** A PDF that is not an invoice the draft can take, said as an error. */
const pdfError = (reason: string, currency = ''): Answer => ({
  outcome: 'error',
  lines: [{ tone: 'error', key: `app.autonomo.pdf.error.${reason}`, values: { currency } }],
});

/** The sheets of a book file, or the error that keeps it from being read. */
async function sheetsOf(file: File): Promise<Sheets | Answer> {
  try {
    return await readSpreadsheet(file);
  } catch (e) {
    const code = e instanceof SpreadsheetError ? e.code : 'unreadable';
    return {
      outcome: 'error',
      lines: [{ tone: 'error', key: `app.autonomo.import.error.${code}` }],
    };
  }
}

/**
 * One place to bring everything in: invoice books (Excel or CSV), filed modelos 130 and 303 and
 * invoices (PDF), chosen or dropped many at a time. Each file says what it is; one that does not is
 * asked about.
 */
export function AutonomoImport({
  form,
  year,
  years,
  onChange,
  onPeriod,
  onShow,
  onCarry,
}: {
  form: ManualForm;
  year: number;
  /** The years a draft can be prepared for. */
  years: readonly number[];
  onChange: (form: ManualForm) => void;
  /** Moves the draft to the year and quarter a PDF is about. */
  onPeriod: (year: number, quarter: Quarter) => void;
  /** Opens an imported invoice in the review. */
  onShow?: (id: string) => void;
  /** What the 390 of last year hands to this one (VAT to offset, provisional prorrata). */
  onCarry?: (carry: NonNullable<Applied['carry']>) => void;
}) {
  const { t } = useI18n();
  const [results, setResults] = useState<FileResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<Me | null>(() => storage.getJSON<Me | null>(ME_KEY, null));
  // The form and the year as they are when each file has been read, not when the files were chosen:
  // the files of one drop are applied one after the other.
  const latest = useRef({ form, year, me });
  latest.current = { form, year, me };
  const counter = useRef(0);

  /** Applies what a file gave to the form as it is now, and moves the draft when a PDF says so. */
  const apply = ({ form: next, lines, period, carry }: Applied): Line[] => {
    if (carry) onCarry?.(carry);
    if (next) {
      latest.current = { ...latest.current, form: next };
      onChange(next);
    }
    if (period) {
      latest.current.year = period.year;
      onPeriod(period.year, period.quarter);
    }
    return lines;
  };

  const remember = (who: Me | null) => {
    if (who) storage.setJSON(ME_KEY, who);
    else storage.set(ME_KEY, null);
    latest.current.me = who;
    setMe(who);
  };

  const preferences = () => storage.getJSON<KindPreferences>(KIND_PREFERENCES_KEY, {});
  const importSheets = (kind: BookKind, sheets: Sheets) =>
    apply(importBook(latest.current.form, kind, sheets, latest.current.year, preferences()));

  /** An invoice in PDF into a book; the first one said to be issued teaches the app who the person is. */
  const importPdf = (invoice: InvoicePdf, book: BookKind, sure: boolean): Answer => {
    if (book === 'issued' && !latest.current.me && (invoice.issuer.nif || invoice.issuer.name))
      remember({ nif: invoice.issuer.nif, name: invoice.issuer.name });
    const applied = importInvoicePdf(latest.current.form, invoice, book, preferences());
    const again = !applied.form;
    const lines = apply(applied);
    return {
      lines,
      outcome: again ? 'again' : invoice.review.length > 0 ? 'review' : 'added',
      ids: applied.ids,
      ...(!sure && !again && book === 'received'
        ? { change: { invoice, ids: applied.ids as string[] } }
        : {}),
    };
  };

  const loadBook = async (file: File): Promise<Answer> => {
    const sheets = await sheetsOf(file);
    if (!Array.isArray(sheets)) return sheets;
    const { books, unknown } = detectBooks(sheets, file.name);
    const kinds = (['issued', 'received'] as const).filter((k) => books[k]);
    if (kinds.length > 0)
      return { outcome: 'other', lines: kinds.flatMap((k) => importSheets(k, books[k] as Sheets)) };
    if (unknown.length > 0) return { outcome: 'ask', lines: [], ask: unknown };
    return {
      outcome: 'error',
      lines: [{ tone: 'error', key: 'app.autonomo.import.error.noHeader' }],
    };
  };

  const loadPdf = async (file: File): Promise<Answer> => {
    let read: ImportPdf | null;
    try {
      read = await readImportPdf(file);
    } catch {
      read = null;
    }
    if (!read || read.kind === 'model') {
      const lines = apply(
        importModel(latest.current.form, read && read.parsed, latest.current.year, years)
      );
      return { outcome: lines[0].tone === 'error' ? 'error' : 'other', lines };
    }
    const { parsed } = read;
    if (!parsed.ok) return pdfError(parsed.reason, parsed.currency);
    const { book, sure } = bookOf(parsed.invoice, latest.current.me);
    if (book === null) return { outcome: 'ask', lines: [], askPdf: parsed.invoice };
    return importPdf(parsed.invoice, book, sure);
  };

  const load = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    setResults([]);
    for (const file of files) {
      const id = ++counter.current;
      const result = isPdf(file) ? await loadPdf(file) : await loadBook(file);
      setResults((list) => [...list, { id, name: file.name, ...result }]);
    }
    setBusy(false);
  };

  const replace = (result: FileResult, answer: Answer) =>
    setResults((list) =>
      list.map((r) => (r.id === result.id ? { id: r.id, name: r.name, ...answer } : r))
    );

  const answer = (result: FileResult, kind: BookKind) =>
    replace(result, { outcome: 'other', lines: importSheets(kind, result.ask as Sheets) });

  const answerPdf = (result: FileResult, kind: BookKind) =>
    replace(result, importPdf(result.askPdf as InvoicePdf, kind, true));

  /** An invoice taken as an expense that the person issued: out of the expenses, into the income. */
  const changeBook = (result: FileResult) => {
    const { invoice, ids } = result.change as NonNullable<FileResult['change']>;
    const { list, quarters } = dropInvoices(latest.current.form.invoices, ids);
    apply({ form: applyChanged({ ...latest.current.form, invoices: list }, quarters), lines: [] });
    replace(result, importPdf(invoice, 'issued', true));
  };

  return (
    <section className="autonomo-panel autonomo-import" aria-label={t('app.autonomo.import.title')}>
      <h3>{t('app.autonomo.import.title')}</h3>
      <p className="section-hint">{t('app.autonomo.import.hint', { year })}</p>
      <DropZone busy={busy} onFiles={(files) => void load(files)} />

      {me && <KnownMe me={me} onForget={() => remember(null)} />}
      {results.length > 1 && !busy && <Summary results={results} />}
      {results.length > 0 && (
        <FileResults
          results={results}
          onAnswer={answer}
          onAnswerPdf={answerPdf}
          onChangeBook={changeBook}
          onShow={onShow}
        />
      )}

      <TemplateLinks />
    </section>
  );
}
