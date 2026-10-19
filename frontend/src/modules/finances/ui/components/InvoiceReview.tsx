import { useEffect, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { storage } from '@shared/utils/storage';
import { EXPENSE_KINDS, type ExpenseKind } from '@modules/finances/domain/types';
import type { BookKind } from '../../domain/invoiceBook';
import {
  sameSupplier,
  supplierKey,
  updateInvoices,
  type ImportedInvoice,
  type InvoicePatch,
  type KindPreferences,
} from '../../domain/invoiceLedger';
import { applyInvoices, KIND_PREFERENCES_KEY } from './importForm';
import { bringIntoView } from './bringIntoView';
import { RetentionCell } from './InvoiceRetention';
import type { ManualForm } from './AutonomoManual';

/** An invoice to show: `n` changes on every request, so asking twice for the same one works. */
export interface ReviewFocus {
  id: string | null;
  n: number;
}

export const invoiceRowId = (id: string) => `autonomo-invoice-${id}`;

/** The invoices with a change, and the quarters it touches worked out again. */
function withChange(
  form: ManualForm,
  ids: string[],
  patch: InvoicePatch
): ManualForm {
  const { list, quarters } = updateInvoices(form.invoices, ids, patch);
  let next: ManualForm = { ...form, invoices: list };
  for (const book of ['issued', 'received'] as const) {
    const changed = quarters[book];
    if (changed) next = applyInvoices(next, book, changed);
  }
  return next;
}

/** The supplier's other invoices can take the kind just chosen for one of them. */
interface Offer {
  id: string;
  kind: ExpenseKind;
  supplier: string;
  others: string[];
}

function BookTable({
  book,
  invoices,
  highlight,
  offer,
  onKind,
  onExcluded,
  onApplyOffer,
  onRetention,
}: {
  book: BookKind;
  invoices: ImportedInvoice[];
  highlight: string | null;
  offer: Offer | null;
  onKind: (invoice: ImportedInvoice, kind: ExpenseKind) => void;
  onExcluded: (invoice: ImportedInvoice, excluded: boolean) => void;
  onApplyOffer: (offer: Offer) => void;
  /** Corrects the withholding of a received invoice (modelos 111 and 115). */
  onRetention: (invoice: ImportedInvoice, patch: InvoicePatch) => void;
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
  ];
  const label = (key: string) => t(`app.autonomo.review.col.${key}`);
  const who = (i: ImportedInvoice) => i.concept || t('app.autonomo.review.noName');
  return (
    <table className="autonomo-review-table">
      <caption>{t(`app.autonomo.review.${book}`, { n: invoices.length })}</caption>
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
        {[...invoices]
          .sort((a, b) => a.date.localeCompare(b.date))
          .flatMap((i) => {
            const name = t('app.autonomo.review.invoice', { who: who(i), date: date(i.date) });
            const row = (
              <tr
                key={i.id}
                id={invoiceRowId(i.id)}
                className={[
                  i.excluded ? 'is-excluded' : '',
                  highlight === i.id ? 'is-highlighted' : '',
                  i.base < 0 ? 'is-negative' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <td data-label={label('include')}>
                  <input
                    type="checkbox"
                    checked={!i.excluded}
                    aria-label={t('app.autonomo.review.includeOf', { invoice: name })}
                    onChange={(e) => onExcluded(i, !e.target.checked)}
                  />
                </td>
                <td data-label={label('date')} className="autonomo-review-date">
                  {date(i.date)}
                </td>
                <td data-label={label('quarter')}>T{i.quarter}</td>
                <td
                  data-label={label(received ? 'supplier' : 'client')}
                  className="autonomo-review-who"
                >
                  {who(i)}
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
                {received && (
                  <RetentionCell
                    invoice={i}
                    name={name}
                    label={label('retention')}
                    onChange={(patch) => onRetention(i, patch)}
                  />
                )}
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
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onApplyOffer(offer)}
                  >
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
  const [open, setOpen] = useState(true);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);

  useEffect(() => {
    if (!focus) return;
    setOpen(true);
    setHighlight(focus.id);
  }, [focus]);

  useEffect(() => {
    if (!focus || !open) return;
    // An invoice: its kind (or its «Include» box when it is left out); the review: its own button.
    if (focus.id) bringIntoView(invoiceRowId(focus.id), ['select:not(:disabled)', 'input']);
    else bringIntoView('autonomo-review', ['button']);
  }, [focus, open]);

  const { invoices } = form;
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

  const books = (['issued', 'received'] as const)
    .map((book) => ({ book, list: invoices.filter((i) => i.book === book) }))
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
      {open && (
        <div id="autonomo-review-body">
          <p className="section-hint">{t('app.autonomo.review.hint')}</p>
          {books.map(({ book, list }) => (
            <div key={book} className="autonomo-review-scroll">
              <BookTable
                book={book}
                invoices={list}
                highlight={highlight}
                offer={offer}
                onKind={setKind}
                onExcluded={(i, value) => {
                  onChange(withChange(form, [i.id], { excluded: value }));
                  setOffer(null);
                }}
                onApplyOffer={applyOffer}
                onRetention={(i, patch) => onChange(withChange(form, [i.id], patch))}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
