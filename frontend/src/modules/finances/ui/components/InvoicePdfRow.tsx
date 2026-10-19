import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { EXPENSE_KINDS, type ExpenseKind, type VatRate } from '@modules/finances/domain/types';
import { bookNumber } from '../../domain/invoiceBook';
import {
  missingOf,
  needsCheck,
  reviewOf,
  type ImportedInvoice,
  type InvoiceEdit,
} from '../../domain/invoiceLedger';

/**
 * The parts of the review that only invoices read from a PDF have: what to check in them, and the
 * correction of their fields in place (the reader can be wrong), with each field validated.
 */

const RATES: VatRate[] = [21, 10, 4, 0];

export const fixButtonId = (id: string) => `autonomo-invoice-fix-${id}`;

/** «Check it: …» under the name of a supplier or client. */
export function PdfFlag({ invoice }: { invoice: ImportedInvoice }) {
  const { t } = useI18n();
  if (!needsCheck(invoice)) return null;
  const reasons = [
    ...reviewOf(invoice).map((r) => t(`app.autonomo.pdf.reason.${r}`)),
    ...(missingOf(invoice).length > 0 ? [t('app.autonomo.review.pdf.missing')] : []),
  ];
  return (
    <span className="autonomo-review-flag">
      <strong>{t('app.autonomo.review.pdf.flag')}</strong> {reasons.join(' · ')}
    </span>
  );
}

/** «Correct» and, when the reading only had doubts, «It is right». */
export function PdfActions({
  invoice,
  name,
  onEdit,
  onChecked,
}: {
  invoice: ImportedInvoice;
  name: string;
  onEdit: () => void;
  onChecked: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="autonomo-review-actions">
      <button
        type="button"
        id={fixButtonId(invoice.id)}
        className="btn-secondary"
        aria-label={t('app.autonomo.review.pdf.editOf', { invoice: name })}
        onClick={onEdit}
      >
        {t('app.autonomo.review.pdf.edit')}
      </button>
      {reviewOf(invoice).length > 0 && missingOf(invoice).length === 0 && (
        <button
          type="button"
          className="btn-secondary"
          aria-label={t('app.autonomo.review.pdf.checkedOf', { invoice: name })}
          onClick={onChecked}
        >
          {t('app.autonomo.review.pdf.checked')}
        </button>
      )}
    </div>
  );
}

/** What the tables need to correct the invoices read from a PDF. */
export interface PdfHandlers {
  editing: string | null;
  onEdit: (invoice: ImportedInvoice) => void;
  onChecked: (invoice: ImportedInvoice) => void;
  onSave: (invoice: ImportedInvoice, edit: InvoiceEdit, kind: ExpenseKind) => void;
  onCancel: () => void;
}

/** Invoices read from a PDF can be corrected: a column for it when the table has any. */
export const pdfColumn = (invoices: ImportedInvoice[]): string[] =>
  invoices.some((i) => i.source === 'pdf') ? ['fix'] : [];

/** An invoice without a date has no quarter yet. */
export const quarterLabel = (i: ImportedInvoice) => (i.date ? `T${i.quarter}` : '—');

/** The cell of the «Correct» column: its buttons on an invoice read from a PDF, empty otherwise. */
export function PdfFixCell({
  columns,
  invoice,
  name,
  pdf,
}: {
  columns: string[];
  invoice: ImportedInvoice;
  name: string;
  pdf: PdfHandlers;
}) {
  const { t } = useI18n();
  if (!columns.includes('fix')) return null;
  return (
    <td data-label={t('app.autonomo.review.col.fix')}>
      {invoice.source === 'pdf' && (
        <PdfActions
          invoice={invoice}
          name={name}
          onEdit={() => pdf.onEdit(invoice)}
          onChecked={() => pdf.onChecked(invoice)}
        />
      )}
    </td>
  );
}

type FieldName = 'date' | 'who' | 'base' | 'rate';

interface Draft {
  date: string;
  who: string;
  base: string;
  rate: string;
  kind: ExpenseKind;
}

const draftOf = (i: ImportedInvoice): Draft => {
  const missing = missingOf(i);
  return {
    date: missing.includes('date') ? '' : i.date,
    who: i.concept,
    base: missing.includes('base') ? '' : String(i.base).replace('.', ','),
    rate: missing.includes('rate') ? '' : String(i.vatRate),
    kind: i.kind,
  };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What is wrong in each field, or the correction when nothing is. */
function validate(d: Draft): { errors: Partial<Record<FieldName, string>>; edit?: InvoiceEdit } {
  const errors: Partial<Record<FieldName, string>> = {};
  const base = bookNumber(d.base);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || Number.isNaN(Date.parse(d.date))) errors.date = 'date';
  if (d.who.trim() === '') errors.who = 'who';
  if (!Number.isFinite(base) || base === 0) errors.base = 'base';
  if (d.rate === '') errors.rate = 'rate';
  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    edit: { date: d.date, concept: d.who, base: round2(base), vatRate: Number(d.rate) as VatRate },
  };
}

const ORDER: FieldName[] = ['date', 'who', 'base', 'rate'];

/** The same look as the cells of a row that is not being corrected. */
const CELL_CLASS: Record<string, string> = {
  vat: 'num',
  total: 'num',
  withheld: 'num',
  supplier: 'autonomo-review-who',
  client: 'autonomo-review-who',
  kind: 'autonomo-review-kind',
};

/** The kind of expense of the invoice being corrected. */
function KindSelect({
  name,
  value,
  onChange,
}: {
  name: string;
  value: ExpenseKind;
  onChange: (kind: ExpenseKind) => void;
}) {
  const { t } = useI18n();
  return (
    <select
      className="tx-input"
      aria-label={t('app.autonomo.review.kindOf', { invoice: name })}
      value={value}
      onChange={(e) => onChange(e.target.value as ExpenseKind)}
    >
      {EXPENSE_KINDS.map((kind) => (
        <option key={kind} value={kind}>
          {t(`app.autonomo.kind.${kind}`)}
        </option>
      ))}
    </select>
  );
}

/** One invoice as a row of fields to correct; Escape cancels, Enter saves. */
export function PdfEditRow({
  invoice,
  columns,
  name,
  onSave,
  onCancel,
}: {
  invoice: ImportedInvoice;
  /** The columns of the table, in order: each gets its field. */
  columns: string[];
  name: string;
  onSave: (edit: InvoiceEdit, kind: ExpenseKind) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const [draft, setDraft] = useState<Draft>(() => draftOf(invoice));
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const refs = useRef<Partial<Record<FieldName, HTMLInputElement | HTMLSelectElement | null>>>({});

  useEffect(() => {
    refs.current.date?.focus();
  }, []);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const save = () => {
    const result = validate(draft);
    setErrors(result.errors);
    if (result.edit) onSave(result.edit, draft.kind);
    else refs.current[ORDER.find((f) => result.errors[f]) as FieldName]?.focus();
  };
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      save();
    }
  };

  const errorId = (f: FieldName) => `autonomo-invoice-${invoice.id}-${f}-error`;
  const field = (f: FieldName) => ({
    'aria-label': t(`app.autonomo.review.pdf.field.${f}`, { invoice: name }),
    'aria-invalid': errors[f] ? true : undefined,
    'aria-describedby': errors[f] ? errorId(f) : undefined,
    ref: (el: HTMLInputElement | HTMLSelectElement | null) => {
      refs.current[f] = el;
    },
  });
  const error = (f: FieldName) =>
    errors[f] && (
      <span id={errorId(f)} className="inline-error">
        {t(`app.autonomo.review.pdf.error.${f}`)}
      </span>
    );

  const textInput = (f: 'date' | 'who' | 'base', extra: InputHTMLAttributes<HTMLInputElement>) => (
    <>
      <input
        className="tx-input"
        value={draft[f]}
        onChange={(e) => set({ [f]: e.target.value })}
        {...extra}
        {...field(f)}
      />
      {error(f)}
    </>
  );

  const label = (key: string) => t(`app.autonomo.review.col.${key}`);
  const base = bookNumber(draft.base);
  const vat =
    Number.isFinite(base) && draft.rate !== '' ? round2((base * Number(draft.rate)) / 100) : null;
  const month = Number(draft.date.slice(5, 7));
  const cells: Record<string, ReactNode> = {
    include: <input type="checkbox" checked={false} disabled aria-label={label('include')} />,
    date: textInput('date', { type: 'date' }),
    quarter: <>{month >= 1 && month <= 12 ? `T${Math.floor((month - 1) / 3) + 1}` : '—'}</>,
    supplier: textInput('who', {}),
    base: textInput('base', { inputMode: 'decimal' }),
    rate: (
      <>
        <select
          className="tx-input"
          value={draft.rate}
          onChange={(e) => set({ rate: e.target.value })}
          {...field('rate')}
        >
          <option value="">—</option>
          {RATES.map((r) => (
            <option key={r} value={String(r)}>
              {r} %
            </option>
          ))}
        </select>
        {error('rate')}
      </>
    ),
    vat: <>{vat === null ? '—' : money(vat)}</>,
    total: <>{vat === null ? '—' : money(round2(base + vat))}</>,
    kind: <KindSelect name={name} value={draft.kind} onChange={(kind) => set({ kind })} />,
    withheld: <>{money(invoice.withheld)}</>,
    fix: (
      <div className="autonomo-review-actions">
        <button type="button" className="btn-primary" onClick={save}>
          {t('app.autonomo.review.pdf.save')}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          {t('app.autonomo.review.pdf.cancel')}
        </button>
      </div>
    ),
  };
  return (
    <tr
      id={`autonomo-invoice-${invoice.id}`}
      className="is-editing"
      aria-label={t('app.autonomo.review.pdf.editing', { invoice: name })}
      onKeyDown={keys}
    >
      {columns.map((c) => (
        <td key={c} data-label={label(c)} className={CELL_CLASS[c]}>
          {cells[c === 'client' ? 'supplier' : c]}
        </td>
      ))}
    </tr>
  );
}
