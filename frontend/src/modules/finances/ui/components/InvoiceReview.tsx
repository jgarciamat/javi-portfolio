import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { storage } from '@shared/utils/storage';
import { EXPENSE_KINDS, type ExpenseKind } from '@modules/finances/domain/types';
import type { BookKind } from '../../domain/invoiceBook';
import {
  editInvoice,
  missingOf,
  sameSupplier,
  supplierKey,
  updateInvoices,
  type ImportedInvoice,
  type InvoiceEdit,
  type InvoicePatch,
  type KindPreferences,
} from '../../domain/invoiceLedger';
import {
  fixButtonId,
  pdfColumn,
  PdfEditRow,
  PdfFixCell,
  PdfFlag,
  quarterLabel,
  type PdfHandlers,
} from './InvoicePdfRow';
import { applyChanged, KIND_PREFERENCES_KEY } from './importForm';
import { bringIntoView } from './bringIntoView';
import { RetentionCell } from './InvoiceRetention';
import { VatOpCell } from './InvoiceVatCell';
import type { ManualForm } from './AutonomoManual';
import { INVOICE_PAGE, InvoicePager, pageOfIndex, validPage } from './InvoicePager';
import { ExportButtons } from './ExportButtons';
import { invoiceBookTable } from './invoiceBookTable';

/** An invoice to show: `n` changes on every request, so asking twice for the same one works. */
export interface ReviewFocus {
  id: string | null;
  n: number;
}

export const invoiceRowId = (id: string) => `autonomo-invoice-${id}`;

/** The invoices with a change, and the quarters it touches worked out again. */
function withChange(form: ManualForm, ids: string[], patch: InvoicePatch): ManualForm {
  const { list, quarters } = updateInvoices(form.invoices, ids, patch);
  return applyChanged({ ...form, invoices: list }, quarters);
}

/** The supplier's other invoices can take the kind just chosen for one of them. */
interface Offer {
  id: string;
  kind: ExpenseKind;
  supplier: string;
  others: string[];
}

/** How a row looks: left out, asked for by a warning, a credit note. */
const rowClass = (i: ImportedInvoice, highlight: string | null) =>
  [
    i.excluded ? 'is-excluded' : '',
    highlight === i.id ? 'is-highlighted' : '',
    i.base < 0 ? 'is-negative' : '',
  ]
    .filter(Boolean)
    .join(' ');

/**
 * An invoice read from a PDF being corrected, in the columns of its table. One with fields to fill
 * in stays out of the draft (its «Include» box is off) until they are there.
 */
const editRow = (i: ImportedInvoice, columns: string[], name: string, pdf: PdfHandlers) => (
  <PdfEditRow
    key={i.id}
    invoice={i}
    columns={columns}
    name={name}
    onSave={(edit: InvoiceEdit, kind: ExpenseKind) => pdf.onSave(i, edit, kind)}
    onCancel={pdf.onCancel}
  />
);

/** The invoices of a book in the order of the table: by date. */
const sortedOf = (list: ImportedInvoice[]) =>
  [...list].sort((a, b) => a.date.localeCompare(b.date));

function BookTable({
  book,
  invoices,
  caption,
  highlight,
  offer,
  onKind,
  onExcluded,
  onApplyOffer,
  onRetention,
  onVat,
  pdf,
}: {
  book: BookKind;
  /** The invoices of the page shown, in order. */
  invoices: ImportedInvoice[];
  /** The caption, with the number of invoices of the whole book. */
  caption: string;
  highlight: string | null;
  offer: Offer | null;
  onKind: (invoice: ImportedInvoice, kind: ExpenseKind) => void;
  onExcluded: (invoice: ImportedInvoice, excluded: boolean) => void;
  onApplyOffer: (offer: Offer) => void;
  /** Corrects the withholding of a received invoice (modelos 111 and 115). */
  onRetention: (invoice: ImportedInvoice, patch: InvoicePatch) => void;
  /** Corrects what the invoice is for VAT, and the VAT number of an intra-EU one. */
  onVat: (invoice: ImportedInvoice, patch: InvoicePatch) => void;
  pdf: PdfHandlers;
}) {
  const { t } = useI18n();
  const { money, date } = useFormat();
  const received = book === 'received';
  const head = [
    'include',
    'date',
    'quarter',
    received ? 'supplier' : 'client',
    'base',
    'rate',
    'vat',
    'total',
    received ? 'kind' : 'withheld',
    ...(received ? ['retention'] : []),
    'op',
    ...pdfColumn(invoices),
  ];
  const label = (key: string) => t(`app.autonomo.review.col.${key}`);
  const who = (i: ImportedInvoice) => i.concept || t('app.autonomo.review.noName');
  const when = (i: ImportedInvoice) => (i.date ? date(i.date) : t('app.autonomo.pdf.noDate'));
  return (
    <table className="autonomo-review-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((key) => (
            <th key={key} scope="col">
              {label(key)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {invoices.flatMap((i) => {
          const name = t('app.autonomo.review.invoice', { who: who(i), date: when(i) });
          if (pdf.editing === i.id) return [editRow(i, head, name, pdf)];
          const row = (
            <tr key={i.id} id={invoiceRowId(i.id)} className={rowClass(i, highlight)}>
              <td data-label={label('include')}>
                <input
                  type="checkbox"
                  checked={!i.excluded}
                  disabled={missingOf(i).length > 0}
                  aria-label={t('app.autonomo.review.includeOf', { invoice: name })}
                  onChange={(e) => onExcluded(i, !e.target.checked)}
                />
              </td>
              <td data-label={label('date')} className="autonomo-review-date">
                {when(i)}
              </td>
              <td data-label={label('quarter')}>{quarterLabel(i)}</td>
              <td
                data-label={label(received ? 'supplier' : 'client')}
                className="autonomo-review-who"
              >
                {who(i)}
                <PdfFlag invoice={i} />
              </td>
              <td data-label={label('base')} className="num">
                {money(i.base)}
              </td>
              <td data-label={label('rate')} className="num">
                {i.vatRate} %
              </td>
              <td data-label={label('vat')} className="num">
                {money(i.vat)}
              </td>
              <td data-label={label('total')} className="num">
                {money(i.total)}
              </td>
              {received ? (
                <td data-label={label('kind')} className="autonomo-review-kind">
                  <select
                    className="tx-input"
                    aria-label={t('app.autonomo.review.kindOf', { invoice: name })}
                    value={i.kind}
                    disabled={i.excluded}
                    onChange={(e) => onKind(i, e.target.value as ExpenseKind)}
                  >
                    {EXPENSE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {t(`app.autonomo.kind.${kind}`)}
                      </option>
                    ))}
                  </select>
                </td>
              ) : (
                <td data-label={label('withheld')} className="num">
                  {money(i.withheld)}
                </td>
              )}
              {received && <RetentionCell invoice={i} name={name} onChange={onRetention} />}
              <VatOpCell invoice={i} name={name} onChange={onVat} />
              <PdfFixCell columns={head} invoice={i} name={name} pdf={pdf} />
            </tr>
          );
          if (offer?.id !== i.id) return [row];
          return [
            row,
            <tr key={`${i.id}-offer`} className="autonomo-review-offer">
              <td colSpan={head.length}>
                <span>
                  {t('app.autonomo.review.offer', {
                    n: offer.others.length,
                    supplier: offer.supplier,
                    kind: t(`app.autonomo.kind.${offer.kind}`),
                  })}
                </span>
                <button type="button" className="btn-secondary" onClick={() => onApplyOffer(offer)}>
                  {t('app.autonomo.review.applyAll', { n: offer.others.length })}
                </button>
              </td>
            </tr>,
          ];
        })}
      </tbody>
    </table>
  );
}

/** A book with its pager above and below when it has more than one page. */
function PagedBook({
  invoices,
  page,
  onPage,
  ...rest
}: Omit<Parameters<typeof BookTable>[0], 'caption'> & {
  /** Every invoice of the book, in order: the totals do not depend on the page. */
  page: number;
  onPage: (page: number) => void;
}) {
  const { t } = useI18n();
  const caption = t(`app.autonomo.review.${rest.book}`, { n: invoices.length });
  const shown = invoices.slice((page - 1) * INVOICE_PAGE, page * INVOICE_PAGE);
  const pager = invoices.length > INVOICE_PAGE && (
    <InvoicePager current={page} count={invoices.length} label={caption} go={onPage} />
  );
  return (
    <>
      {pager}
      <BookTable {...rest} invoices={shown} caption={caption} />
      {pager}
    </>
  );
}

/**
 * Every invoice imported, to check it: the kind of each expense can be corrected (and is remembered
 * for the supplier), and an invoice can be left out. The quarters follow at once.
 */
export function InvoiceReview({
  form,
  onChange,
  focus,
}: {
  form: ManualForm;
  onChange: (form: ManualForm) => void;
  focus: ReviewFocus | null;
}) {
  const { t } = useI18n();
  const { currency } = useFormat();
  const [open, setOpen] = useState(true);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  // After a correction, the focus goes back to the button that opened it.
  const [returnTo, setReturnTo] = useState<string | null>(null);
  // The page of each table; kept when the invoices change, and brought back into range.
  const [pages, setPages] = useState<Record<BookKind, number>>({ issued: 1, received: 1 });
  // The focus request already scrolled to (it waits for its page to be on screen).
  const scrolled = useRef<number | null>(null);

  useEffect(() => {
    if (returnTo) document.getElementById(fixButtonId(returnTo))?.focus();
  }, [returnTo]);

  const { invoices } = form;

  useEffect(() => {
    if (!focus) return;
    setOpen(true);
    setHighlight(focus.id);
    // The page of the invoice asked for, in its own table.
    const target = invoices.find((i) => i.id === focus.id);
    if (!target) return;
    const index = sortedOf(invoices.filter((i) => i.book === target.book)).indexOf(target);
    setPages((p) => ({ ...p, [target.book]: pageOfIndex(index) }));
    // Only a new request moves the page; the invoices changing afterwards do not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => {
    if (!focus || !open || scrolled.current === focus.n) return;
    // An invoice: its kind (or its «Include» box when it is left out); the review: its own button.
    const done = focus.id
      ? bringIntoView(invoiceRowId(focus.id), ['select:not(:disabled)', 'input'])
      : bringIntoView('autonomo-review', ['button']);
    if (done) scrolled.current = focus.n;
  }, [focus, open, pages]);

  if (invoices.length === 0) return null;

  const setKind = (invoice: ImportedInvoice, kind: ExpenseKind) => {
    const preferences = storage.getJSON<KindPreferences>(KIND_PREFERENCES_KEY, {});
    const key = supplierKey(invoice.concept);
    if (key) storage.setJSON(KIND_PREFERENCES_KEY, { ...preferences, [key]: kind });
    const next = withChange(form, [invoice.id], { kind });
    onChange(next);
    const others = sameSupplier(next.invoices, { ...invoice, kind }).map((i) => i.id);
    setOffer(
      others.length > 0 ? { id: invoice.id, kind, supplier: invoice.concept, others } : null
    );
  };

  const applyOffer = (o: Offer) => {
    onChange(withChange(form, o.others, { kind: o.kind }));
    setOffer(null);
  };

  const close = (id: string) => {
    setEditing(null);
    setReturnTo(id);
  };
  const pdf: PdfHandlers = {
    editing,
    onEdit: (i) => {
      setEditing(i.id);
      setReturnTo(null);
      setOffer(null);
    },
    onChecked: (i) => onChange(withChange(form, [i.id], { review: [] })),
    onSave: (i, edit, kind) => {
      const key = supplierKey(edit.concept);
      if (kind !== i.kind && key) {
        const preferences = storage.getJSON<KindPreferences>(KIND_PREFERENCES_KEY, {});
        storage.setJSON(KIND_PREFERENCES_KEY, { ...preferences, [key]: kind });
      }
      const { list, quarters } = editInvoice(form.invoices, i.id, edit);
      const fixed = list.map((x) => (x.id === i.id ? { ...x, kind } : x));
      onChange(applyChanged({ ...form, invoices: fixed }, quarters));
      close(i.id);
    },
    onCancel: () => close(editing as string),
  };

  const books = (['issued', 'received'] as const)
    .map((book) => ({ book, list: sortedOf(invoices.filter((i) => i.book === book)) }))
    .filter((b) => b.list.length > 0);
  const excluded = invoices.filter((i) => i.excluded).length;

  return (
    <section
      className="autonomo-panel autonomo-review"
      id="autonomo-review"
      aria-labelledby="autonomo-review-title"
    >
      <div className="autonomo-panel-head">
        <h3 id="autonomo-review-title">{t('app.autonomo.review.title')}</h3>
        <button
          type="button"
          className="btn-secondary"
          aria-expanded={open}
          aria-controls="autonomo-review-body"
          onClick={() => setOpen(!open)}
        >
          {open ? t('app.autonomo.review.hide') : t('app.autonomo.review.show')}
        </button>
      </div>
      <p className="section-hint">
        {t('app.autonomo.review.summary', { n: invoices.length })}
        {excluded > 0 && ` ${t('app.autonomo.review.excluded', { n: excluded })}`}
      </p>
      {books.map(({ book, list }) => (
        <ExportButtons
          key={book}
          name={`facturas-${book === 'issued' ? 'emitidas' : 'recibidas'}`}
          what={t(`app.autonomo.export.${book}`)}
          count={list.length}
          table={() => invoiceBookTable(book, list, t, currency)}
        />
      ))}
      {open && (
        <div id="autonomo-review-body">
          <p className="section-hint">{t('app.autonomo.review.hint')}</p>
          {invoices.some((i) => i.source === 'pdf') && (
            <p className="section-hint">{t('app.autonomo.review.pdf.hint')}</p>
          )}
          {books.map(({ book, list }) => (
            <div key={book} className="autonomo-review-scroll">
              <PagedBook
                book={book}
                invoices={list}
                page={validPage(pages[book], list.length)}
                onPage={(page) => setPages({ ...pages, [book]: page })}
                highlight={highlight}
                offer={offer}
                onKind={setKind}
                onExcluded={(i, value) => {
                  onChange(withChange(form, [i.id], { excluded: value }));
                  setOffer(null);
                }}
                onApplyOffer={applyOffer}
                onRetention={(i, patch) => onChange(withChange(form, [i.id], patch))}
                onVat={(i, patch) => onChange(withChange(form, [i.id], patch))}
                pdf={pdf}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
