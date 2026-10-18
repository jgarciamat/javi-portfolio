import { useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import {
  expensesByQuarter,
  incomeByQuarter,
  parseWorkbook,
  type BookKind,
  type BookParse,
  type BookSkipped,
} from '../../domain/invoiceBook';
import { readSpreadsheet, SpreadsheetError } from '../../application/spreadsheet';
import type { ManualForm } from './AutonomoManual';

type QuarterForm = ManualForm['quarters'][number];

/** Money as the form's text fields take it: no zeros left over, a dot for the decimals. */
const text = (n: number): string => (n === 0 ? '' : String(n));

/** What the import did, as numbers; the texts are put together when it is shown. */
interface Outcome {
  kind: BookKind;
  count: number;
  quarters: number[];
  skipped: BookSkipped;
}

/** The form with the invoices of the book in their quarters: those quarters are replaced, the rest stay. */
export function applyBook(
  form: ManualForm,
  kind: BookKind,
  entries: Parameters<typeof incomeByQuarter>[0]
) {
  const income = incomeByQuarter(entries);
  const expenses = expensesByQuarter(entries);
  const quarters = form.quarters.map((quarter, index): QuarterForm => {
    const q = (index + 1) as 1 | 2 | 3 | 4;
    if (kind === 'issued') {
      const sums = income[q];
      if (!sums) return quarter;
      return {
        ...quarter,
        income: { r21: text(sums.r21), r10: text(sums.r10), r4: text(sums.r4), r0: text(sums.r0) },
        withheld: text(sums.withheld),
      };
    }
    const lines = expenses[q];
    if (!lines) return quarter;
    return {
      ...quarter,
      expenses: lines.map((l) => ({
        kind: l.kind,
        amount: text(l.amount),
        vatRate: l.vatRate,
        days: l.days === null ? '' : String(l.days),
      })),
    };
  });
  return { ...form, quarters };
}

const SKIPPED: (keyof BookSkipped)[] = ['year', 'rate', 'amount'];

/** The two books of an invoice-keeping spreadsheet: what was billed and what was paid, each with its button. */
export function InvoiceImport({
  form,
  year,
  onChange,
}: {
  form: ManualForm;
  year: number;
  onChange: (form: ManualForm) => void;
}) {
  const { t } = useI18n();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The form as it is when the file has been read, not as it was when it was chosen.
  const latest = useRef(form);
  latest.current = form;
  const inputs = {
    issued: useRef<HTMLInputElement>(null),
    received: useRef<HTMLInputElement>(null),
  };

  const load = async (kind: BookKind, file: File) => {
    setOutcome(null);
    setError(null);
    let parsed: BookParse;
    try {
      parsed = parseWorkbook(await readSpreadsheet(file), kind, year);
    } catch (e) {
      setError(e instanceof SpreadsheetError ? e.code : 'unreadable');
      return;
    }
    if (!parsed.ok) {
      setError(parsed.reason);
      return;
    }
    const { entries, skipped } = parsed.result;
    if (entries.length === 0) {
      setError('empty');
      setOutcome({ kind, count: 0, quarters: [], skipped });
      return;
    }
    onChange(applyBook(latest.current, kind, entries));
    setOutcome({
      kind,
      count: entries.length,
      quarters: Array.from(new Set(entries.map((e) => e.quarter))).sort(),
      skipped,
    });
  };

  const books: { kind: BookKind; file: string }[] = [
    { kind: 'issued', file: 'facturas-emitidas.xlsx' },
    { kind: 'received', file: 'facturas-recibidas.xlsx' },
  ];

  return (
    <section className="autonomo-panel autonomo-import" aria-label={t('app.autonomo.import.title')}>
      <h3>{t('app.autonomo.import.title')}</h3>
      <p className="section-hint">{t('app.autonomo.import.hint', { year })}</p>
      <div className="autonomo-import-books">
        {books.map(({ kind, file }) => (
          <div key={kind} className="autonomo-import-book">
            <h4>{t(`app.autonomo.import.${kind}`)}</h4>
            <p className="section-hint">{t(`app.autonomo.import.${kind}Hint`)}</p>
            <input
              ref={inputs[kind]}
              type="file"
              hidden
              accept=".xlsx,.xlsm,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              aria-label={t(`app.autonomo.import.${kind}File`)}
              onChange={(e) => {
                const picked = e.target.files?.[0];
                e.target.value = '';
                if (picked) void load(kind, picked);
              }}
            />
            <div className="autonomo-import-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => inputs[kind].current?.click()}
              >
                {t(`app.autonomo.import.${kind}Button`)}
              </button>
              <a className="btn-secondary" href={`/plantillas/${file}`} download>
                {t('app.autonomo.import.template')}
              </a>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {t(`app.autonomo.import.error.${error}`, { year })}
        </p>
      )}
      {outcome && outcome.count > 0 && (
        <div className="autonomo-import-result" role="status">
          <p>
            {t(`app.autonomo.import.done.${outcome.kind}`, {
              count: outcome.count,
              year,
              quarters: outcome.quarters.map((q) => `T${q}`).join(', '),
            })}
          </p>
          {outcome.kind === 'received' && (
            <p className="section-hint">{t('app.autonomo.import.review')}</p>
          )}
        </div>
      )}
      {outcome && SKIPPED.some((k) => outcome.skipped[k] > 0) && (
        <ul className="autonomo-import-skipped">
          {SKIPPED.filter((k) => outcome.skipped[k] > 0).map((k) => (
            <li key={k}>
              {t(`app.autonomo.import.skipped.${k}`, { n: outcome.skipped[k], year })}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
