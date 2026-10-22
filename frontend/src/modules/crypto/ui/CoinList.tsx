import { useEffect, useRef } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { formatChange, tone } from '../domain/format';
import type { CryptoCoin } from '../domain/types';
import { useMoney } from './money';

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
 * The coins of the console, all of them: a column with its own scroll beside the chart on wide
 * screens, a row that slides sideways on phones. Each one shows its pair, price and 24-hour change.
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

  // The chosen coin stays in sight inside the list, without moving the page.
  useEffect(() => {
    const box = list.current!;
    const item = box.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!item) return;
    box.scrollTop = item.offsetTop - (box.clientHeight - item.offsetHeight) / 2;
    box.scrollLeft = item.offsetLeft - (box.clientWidth - item.offsetWidth) / 2;
  }, [selected, coins.length]);

  return (
    <nav className="cc-coins" aria-label={t('app.crypto.coins.title')}>
      <h3 className="cc-coins-title">{t('app.crypto.coins.title')}</h3>
      <ul ref={list} className="cc-coins-list">
        {coins.map((coin) => (
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
    </nav>
  );
}
