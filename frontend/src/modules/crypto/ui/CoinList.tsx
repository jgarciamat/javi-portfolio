import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';
import { formatChange, tone } from '../domain/format';
import type { CryptoCoin } from '../domain/types';
import { useMoney } from './money';

export const COINS_PER_PAGE = 8;
export const PHONE = '(max-width: 719px)';

/** A round badge with the coin's letters, in a colour of its own (no outside images). */
export function CoinIcon({ symbol }: { symbol: string }) {
  const hue = [...symbol].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 17);
  return (
    <span className="cc-coin-icon" style={{ background: `hsl(${hue} 60% 38%)` }} aria-hidden="true">
      {symbol.slice(0, 3)}
    </span>
  );
}

/**
 * The coins of the console: a column with pages on wide screens, a row that slides sideways on
 * phones. Each one shows its pair, price and 24-hour change.
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
  const phone = useMediaQuery(PHONE);
  const pages = Math.max(1, Math.ceil(coins.length / COINS_PER_PAGE));
  // Until the person turns the page, the one with the chosen coin is shown.
  const [page, setPage] = useState<number | null>(null);
  const chosenPage = Math.floor(
    Math.max(
      0,
      coins.findIndex((c) => c.symbol === selected)
    ) / COINS_PER_PAGE
  );
  const current = Math.min(page ?? chosenPage, pages - 1);
  const shown = phone
    ? coins
    : coins.slice(current * COINS_PER_PAGE, (current + 1) * COINS_PER_PAGE);

  return (
    <nav className="cc-coins" aria-label={t('app.crypto.coins.title')}>
      <h3 className="cc-coins-title">{t('app.crypto.coins.title')}</h3>
      <ul className="cc-coins-list">
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
                  <small className={`cc-${tone(coin.changePercent24h)}`}>
                    {formatChange(coin.changePercent24h, locale)}
                  </small>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!phone && pages > 1 && (
        <div className="cc-coins-pager">
          <button
            type="button"
            className="cc-tool"
            disabled={current === 0}
            aria-label={t('app.crypto.coins.previous')}
            onClick={() => setPage(current - 1)}
          >
            {t('app.crypto.coins.previousShort')}
          </button>
          <span>{t('app.crypto.coins.page', { page: current + 1, pages })}</span>
          <button
            type="button"
            className="cc-tool"
            disabled={current === pages - 1}
            aria-label={t('app.crypto.coins.next')}
            onClick={() => setPage(current + 1)}
          >
            {t('app.crypto.coins.nextShort')}
          </button>
        </div>
      )}
    </nav>
  );
}
