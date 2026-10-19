import { useRef, useState, type DragEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { storage } from '@shared/utils/storage';
import { detectBooks, type BookKind } from '../../domain/invoiceBook';
import type { KindPreferences } from '../../domain/invoiceLedger';
import type { TaxModelParse } from '../../domain/taxModelPdf';
import { readSpreadsheet, SpreadsheetError } from '../../application/spreadsheet';
import { readTaxModelPdf } from '../../application/taxModelPdf';
import { KIND_PREFERENCES_KEY } from './importForm';
import { importBook, importModel, type Applied, type Line, type Sheets } from './importFiles';
import type { ManualForm } from './AutonomoManual';

type Quarter = 1 | 2 | 3 | 4;

/** What happened to each file; `ask` keeps the sheets until the person says which book they are. */
interface FileResult {
  id: number;
  name: string;
  lines: Line[];
  ask?: Sheets;
}

const TEMPLATES = [
  ['issued', '/plantillas/facturas-emitidas.xlsx'],
  ['received', '/plantillas/facturas-recibidas.xlsx'],
  ['130', '/plantillas/modelo-130-plantilla.pdf'],
  ['303', '/plantillas/modelo-303-plantilla.pdf'],
] as const;

const isPdf = (file: File) => /\.pdf$/i.test(file.name) || file.type === 'application/pdf';

/** The four templates, each a download link. */
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

/** What each file gave, and the question for a book that does not say which one it is. */
function FileResults({
  results,
  onAnswer,
}: {
  results: FileResult[];
  onAnswer: (result: FileResult, kind: BookKind) => void;
}) {
  const { t } = useI18n();
  return (
    <ul className="autonomo-import-files" aria-label={t('app.autonomo.import.results')}>
      {results.map((r) => (
        <li key={r.id} className="autonomo-import-file">
          <strong>{r.name}</strong>
          {r.ask && (
            <div role="group" aria-label={t('app.autonomo.import.askLabel', { file: r.name })}>
              <p>{t('app.autonomo.import.ask')}</p>
              <div className="autonomo-import-actions">
                {(['issued', 'received'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className="btn-secondary"
                    onClick={() => onAnswer(r, kind)}
                  >
                    {t(`app.autonomo.import.are.${kind}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {r.lines.map((line, i) =>
            line.tone === 'error' ? (
              <p key={i} className="inline-error" role="alert">
                {t(line.key, line.values)}
              </p>
            ) : (
              <p
                key={i}
                className={line.tone === 'note' ? 'section-hint' : undefined}
                role={line.tone === 'done' ? 'status' : undefined}
              >
                {t(line.key, line.values)}
              </p>
            )
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * One place to bring everything in: invoice books (Excel or CSV) and filed modelos 130 and 303 (PDF),
 * chosen or dropped several at a time. Each file says what it is; a book that does not is asked about.
 */
export function AutonomoImport({
  form,
  year,
  years,
  onChange,
  onPeriod,
}: {
  form: ManualForm;
  year: number;
  /** The years a draft can be prepared for. */
  years: readonly number[];
  onChange: (form: ManualForm) => void;
  /** Moves the draft to the year and quarter a PDF is about. */
  onPeriod: (year: number, quarter: Quarter) => void;
}) {
  const { t } = useI18n();
  const [results, setResults] = useState<FileResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // The form and the year as they are when each file has been read, not when the files were chosen:
  // the files of one drop are applied one after the other.
  const latest = useRef({ form, year });
  latest.current = { form, year };
  const counter = useRef(0);

  /** Applies what a file gave to the form as it is now, and moves the draft when a PDF says so. */
  const apply = ({ form: next, lines, period }: Applied): Line[] => {
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

  const preferences = () => storage.getJSON<KindPreferences>(KIND_PREFERENCES_KEY, {});
  const importSheets = (kind: BookKind, sheets: Sheets) =>
    apply(importBook(latest.current.form, kind, sheets, latest.current.year, preferences()));

  const loadBook = async (file: File): Promise<Pick<FileResult, 'lines' | 'ask'>> => {
    let sheets: Sheets;
    try {
      sheets = await readSpreadsheet(file);
    } catch (e) {
      const code = e instanceof SpreadsheetError ? e.code : 'unreadable';
      return { lines: [{ tone: 'error', key: `app.autonomo.import.error.${code}` }] };
    }
    const { books, unknown } = detectBooks(sheets, file.name);
    const kinds = (['issued', 'received'] as const).filter((k) => books[k]);
    if (kinds.length > 0)
      return { lines: kinds.flatMap((k) => importSheets(k, books[k] as Sheets)) };
    if (unknown.length > 0) return { lines: [], ask: unknown };
    return { lines: [{ tone: 'error', key: 'app.autonomo.import.error.noHeader' }] };
  };

  const loadPdf = async (file: File): Promise<Line[]> => {
    let parsed: TaxModelParse | null;
    try {
      parsed = await readTaxModelPdf(file);
    } catch {
      parsed = null;
    }
    return apply(importModel(latest.current.form, parsed, latest.current.year, years));
  };

  const load = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    setResults([]);
    for (const file of files) {
      const id = ++counter.current;
      const result = isPdf(file) ? { lines: await loadPdf(file) } : await loadBook(file);
      setResults((list) => [...list, { id, name: file.name, ...result }]);
    }
    setBusy(false);
  };

  const answer = (result: FileResult, kind: BookKind) => {
    const lines = importSheets(kind, result.ask as Sheets);
    setResults((list) =>
      list.map((r) => (r.id === result.id ? { ...r, lines, ask: undefined } : r))
    );
  };

  const drop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void load(Array.from(e.dataTransfer.files));
  };

  return (
    <section className="autonomo-panel autonomo-import" aria-label={t('app.autonomo.import.title')}>
      <h3>{t('app.autonomo.import.title')}</h3>
      <p className="section-hint">{t('app.autonomo.import.hint', { year })}</p>
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
            void load(picked);
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

      {results.length > 0 && <FileResults results={results} onAnswer={answer} />}

      <TemplateLinks />
    </section>
  );
}
