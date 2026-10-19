import { useI18n } from '@core/i18n/I18nContext';

/** Rows of each table of imported invoices per page. */
export const INVOICE_PAGE = 15;

/** Pages of a list of `count` rows (at least one). */
export const pagesOf = (count: number): number => Math.max(1, Math.ceil(count / INVOICE_PAGE));

/** A page that exists for `count` rows: after an import or a removal it may not any more. */
export const validPage = (page: number, count: number): number =>
  Math.min(Math.max(1, page), pagesOf(count));

/** The page (from 1) of the row at `index` (from 0). */
export const pageOfIndex = (index: number): number => Math.floor(index / INVOICE_PAGE) + 1;

/** First, previous, next and last page, and where the list is: «Página 2 de 4 · Mostrando 16-30 de 61». */
export function InvoicePager({
  current,
  count,
  label,
  go,
}: {
  current: number;
  count: number;
  /** What is paged, for the screen reader: «Facturas emitidas». */
  label: string;
  go: (page: number) => void;
}) {
  const { t } = useI18n();
  const k = 'app.autonomo.review.pages';
  const pages = pagesOf(count);
  const from = (current - 1) * INVOICE_PAGE + 1;
  const to = Math.min(current * INVOICE_PAGE, count);
  const button = (key: string, page: number, disabled: boolean) => (
    <button
      type="button"
      className="btn-secondary"
      disabled={disabled}
      aria-label={t(`${k}.${key}Of`, { what: label })}
      onClick={() => go(page)}
    >
      {t(`${k}.${key}`)}
    </button>
  );
  return (
    <nav className="autonomo-pager" aria-label={t(`${k}.label`, { what: label })}>
      {button('first', 1, current === 1)}
      {button('previous', current - 1, current === 1)}
      <span aria-live="polite">
        {t(`${k}.page`, { current, pages })} · {t(`${k}.showing`, { from, to, count })}
      </span>
      {button('next', current + 1, current === pages)}
      {button('last', pages, current === pages)}
    </nav>
  );
}
