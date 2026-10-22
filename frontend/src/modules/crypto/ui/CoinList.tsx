import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';
import { formatChange, pnl } from '../domain/format';
import type { CryptoCoin } from '../domain/types';
import { useMoney } from './money';

/** Phones, upright or on their side: every coin in one row that slides sideways. */
const ROW_LAYOUT = '(max-width: 719px), (orientation: landscape) and (max-height: 500px)';
/** Rows of a page until the column has been measured. */
export const FALLBACK_ROWS = 8;

/** How many whole rows of `row` px, `gap` px apart, fit in `height` px (at least one). */
export function rowsThatFit(height: number, row: number, gap: number): number {
  if (height <= 0 || row <= 0) return FALLBACK_ROWS;
  return Math.max(1, Math.floor((height + gap) / (row + gap)));
}

const px = (value: string) => parseFloat(value) || 0;

/**
 * Rows that fit in the list as tall as the price and the chart, measured again when it resizes
 * and once there are coins to measure.
 */
function useRowsPerPage(
  list: RefObject<HTMLUListElement | null>,
  paged: boolean,
  filled: boolean
): number {
  const [rows, setRows] = useState(FALLBACK_ROWS);
  useLayoutEffect(() => {
    const box = list.current!;
    if (!paged) return;
    const measure = () => {
      const style = getComputedStyle(box);
      const row = (box.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
      const inner = box.clientHeight - px(style.paddingTop) - px(style.paddingBottom);
      setRows(rowsThatFit(inner, row, px(style.rowGap)));
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(box);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [list, paged, filled]);
  return rows;
}

/** A round badge with the coin's letters, in a colour of its own (no outside images). */
export function CoinIcon({ symbol }: { symbol: string }) {
  const hue = [...symbol].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 17);
  return (
    <span className="cc-coin-icon" style={{ background: `hsl(${hue} 60% 38%)` }} aria-hidden="true">
      {symbol.slice(0, 3)}
    </span>
  );
}

/** «Prev.» and «Next» with the page in between, small, at the foot of the column. */
function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  const { t } = useI18n();
  const button = (to: number, key: 'prev' | 'next', disabled: boolean) => (
    <button
      type="button"
      title={t(`app.crypto.coins.${key}Page`)}
      disabled={disabled}
      onClick={() => onPage(to)}
    >
      {t(`app.crypto.coins.${key}`)}
      <span className="sr-only"> {t(`app.crypto.coins.${key}Page`)}</span>
    </button>
  );
  return (
    <div className="cc-coins-pager">
      {button(page - 1, 'prev', page === 0)}
      <span aria-live="polite">{t('app.crypto.coins.page', { page: page + 1, pages })}</span>
      {button(page + 1, 'next', page >= pages - 1)}
    </div>
  );
}

/**
 * The coins of the console, each with its pair, price and 24-hour change. Beside the chart on
 * wide screens they go in pages of as many whole rows as fit in its height (no scroll inside, no
 * row cut in half); on phones, all of them in a row that slides sideways.
 */
export function CoinList({
  coins,
  selected,
  onSelect,
}: {
  coins: CryptoCoin[];
  selected: string;
  onSelect: (symbol: string) => void;
}) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const list = useRef<HTMLUListElement>(null);
  const paged = !useMediaQuery(ROW_LAYOUT);
  const rows = useRowsPerPage(list, paged, coins.length > 0);
  const pages = Math.max(1, Math.ceil(coins.length / rows));
  const index = coins.findIndex((c) => c.symbol === selected);
  const [page, setPage] = useState(0);

  // The page of the chosen coin, when it changes or the size of the pages does.
  useEffect(() => {
    setPage(Math.max(0, Math.floor(index / rows)));
  }, [index, rows]);
  const current = Math.min(page, pages - 1);
  const shown = paged ? coins.slice(current * rows, (current + 1) * rows) : coins;

  // On phones the chosen coin stays in sight inside the row, without moving the page.
  useEffect(() => {
    if (paged) return;
    const box = list.current!;
    const item = box.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (item) box.scrollLeft = item.offsetLeft - (box.clientWidth - item.offsetWidth) / 2;
  }, [paged, selected, coins.length]);

  return (
    <nav className="cc-coins" aria-label={t('app.crypto.coins.title')}>
      <h3 className="cc-coins-title">{t('app.crypto.coins.title')}</h3>
      <ul ref={list} className="cc-coins-list">
        {shown.map((coin) => (
          <li key={coin.symbol}>
            <button
              type="button"
              className="cc-coin"
              aria-pressed={coin.symbol === selected}
              onClick={() => onSelect(coin.symbol)}
            >
              <CoinIcon symbol={coin.symbol} />
              <span className="cc-coin-name">
                <b>{coin.name}</b>
                <small>
                  {coin.symbol} / {money.display.currency}
                </small>
              </span>
              <span className="cc-coin-price">
                <b>{coin.price === null ? '—' : money.price(coin.price)}</b>
                {coin.changePercent24h !== null && (
                  <small className={pnl(coin.changePercent24h)}>
                    {formatChange(coin.changePercent24h, locale)}
                  </small>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {paged && pages > 1 && <Pager page={current} pages={pages} onPage={setPage} />}
    </nav>
  );
}
