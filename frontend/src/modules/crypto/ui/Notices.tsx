import { useId, useState } from 'react';
import { useI18n, type Locale } from '@core/i18n/I18nContext';
import { formatDateTime } from '../domain/format';
import type { MarketStatus, Quote } from '../domain/types';
import { BookIcon } from './Learn';
import { useMoney } from './money';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Always on screen and never dismissed: play money, not advice, past results do not repeat and
 * crypto can be lost entirely.
 */
export function RiskBanner() {
  const { t } = useI18n();
  return (
    <aside className="cc-risk" role="note" aria-label={t('app.crypto.risk.label')}>
      <strong>{t('app.crypto.risk.title')}</strong>
      <p>{t('app.crypto.risk.body')}</p>
    </aside>
  );
}

/** The sentence about how fresh the prices are, and whether to show it as a warning. */
function freshness(market: MarketStatus, t: Translate, locale: Locale) {
  if (!market.available) return { text: t('app.crypto.data.down'), warn: true };
  const when = formatDateTime(market.updatedAt!, locale);
  if (market.stale) return { text: t('app.crypto.data.stale', { when }), warn: true };
  return { text: t('app.crypto.data.fresh', { when }), warn: false };
}

/** Where the prices of the coin on screen come from, in the currency they are shown in. */
function sourceText(
  market: MarketStatus,
  coin: { symbol: string; quote: Quote } | null,
  usd: boolean,
  usdPerEur: string | null,
  t: Translate
): string {
  if (market.source === 'demo') return t('app.crypto.data.demo');
  if (coin?.quote !== 'USDT')
    return t(usd ? 'app.crypto.data.sourceUsd' : 'app.crypto.data.source');
  if (usd) return t('app.crypto.data.sourceUsdtUsd', { coin: coin.symbol });
  const rate = usdPerEur
    ? t('app.crypto.data.usdtRate', { rate: usdPerEur })
    : t('app.crypto.data.usdtParity');
  return t('app.crypto.data.sourceUsdt', { coin: coin.symbol, rate });
}

/**
 * One discreet note: where the prices come from, how fresh they are and, when they are a
 * conversion, at which rate. Coins with a liquid euro pair (BTC, ETH) are not converted; the
 * rest come from their USDT pair converted to euros at the European Central Bank's rate of the
 * day (1 USDT taken as 1 US$), and in dollars those are shown as they are.
 */
export function DataNotice({
  market,
  unavailable,
  coin,
  usdPerEur,
}: {
  market: MarketStatus;
  unavailable: boolean;
  /** The coin on screen and the market its prices come from (null while it loads). */
  coin: { symbol: string; quote: Quote } | null;
  /** The ECB rate the server converted the USDT prices with. */
  usdPerEur: number | null;
}) {
  const { t, locale } = useI18n();
  const { display } = useMoney();
  const { text, warn } = freshness(market, t, locale);
  const usd = display.currency === 'USD';
  const digits = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 4 });
  const source = sourceText(market, coin, usd, usdPerEur ? digits(usdPerEur) : null, t);
  const rate = digits(display.rate);
  return (
    <p className={`cc-data${warn || unavailable ? ' cc-data--warn' : ''}`}>
      <span>{t('app.crypto.data.delayed')}</span> <span>{source}</span>{' '}
      <span role="status">{text}</span>
      {usd && <> {t('app.crypto.currency.note', { rate })}</>}
      {unavailable && <> {t('app.crypto.currency.unavailable')}</>}
    </p>
  );
}

/** A «What is …?» button that opens a plain explanation right below it. */
export function Help({ term, label }: { term: string; label: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="cc-help">
      <button
        type="button"
        className="btn-link cc-help-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      <span id={id} className="cc-help-text" hidden={!open}>
        {t(`app.crypto.glossary.${term}.text`)}
      </span>
    </span>
  );
}

/** «Learn all the key words»: opens the guide on its words tab. */
export function GlossaryButton({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" className="cc-glossary-open" onClick={onOpen}>
      <BookIcon />
      {t('app.crypto.glossary.open')}
    </button>
  );
}
