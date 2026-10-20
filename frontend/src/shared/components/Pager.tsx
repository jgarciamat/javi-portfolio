import type { KeyboardEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { Pagination } from '@shared/hooks/usePagination';
import './css/Pager.css';

interface PagerProps {
  paging: Pagination;
  /** Items in all. */
  count: number;
  /** What is paged, for the screen reader: «Movements». */
  label: string;
}

/**
 * Previous / next page with «Page X of Y». The arrow keys also turn the page while the
 * focus is in the pager. The buttons stay focusable at the ends (aria-disabled) so the
 * focus is not lost when the last page is reached.
 */
export function Pager({ paging, count, label }: PagerProps) {
  const { t } = useI18n();
  const { page, pages, from, to, go } = paging;
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowLeft') go(page - 1);
    if (e.key === 'ArrowRight') go(page + 1);
  };
  const button = (key: 'previous' | 'next', target: number, disabled: boolean) => (
    <button
      type="button"
      className="btn-secondary pager-btn"
      aria-disabled={disabled}
      aria-label={t(`app.pager.${key}Of`, { what: label })}
      onClick={() => !disabled && go(target)}
    >
      {t(`app.pager.${key}`)}
    </button>
  );
  return (
    <nav className="pager" aria-label={t('app.pager.label', { what: label })} onKeyDown={onKeyDown}>
      {button('previous', page - 1, page === 1)}
      <span className="pager-status" aria-live="polite">
        {t('app.pager.page', { current: page, pages })} ·{' '}
        {t('app.pager.showing', { from, to, count })}
      </span>
      {button('next', page + 1, page === pages)}
    </nav>
  );
}
