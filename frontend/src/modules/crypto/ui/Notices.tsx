import { useId, useState } from 'react';
import { useI18n, type Locale } from '@core/i18n/I18nContext';
import { formatDateTime } from '../domain/format';
import type { MarketStatus } from '../domain/types';
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
function freshness(market: MarketStatus | null, t: Translate, locale: Locale) {
  if (!market) return { text: t('app.crypto.data.loading'), warn: false };
  if (!market.available) return { text: t('app.crypto.data.down'), warn: true };
  const when = formatDateTime(market.updatedAt!, locale);
  if (market.stale) return { text: t('app.crypto.data.stale', { when }), warn: true };
  return { text: t('app.crypto.data.fresh', { when }), warn: false };
}

/**
 * One discreet note: where the prices come from, how fresh they are and, in dollars, that they are
 * a conversion. Binance quotes real euro pairs, so euros are never converted; dollars are the
 * euro price at the European Central Bank's rate of the day.
 */
export function DataNotice({
  market,
  unavailable,
}: {
  market: MarketStatus | null;
  unavailable: boolean;
}) {
  const { t, locale } = useI18n();
  const { display } = useMoney();
  const { text, warn } = freshness(market, t, locale);
  const usd = display.currency === 'USD';
  const source =
    market?.source === 'demo'
      ? t('app.crypto.data.demo')
      : t(usd ? 'app.crypto.data.sourceUsd' : 'app.crypto.data.source');
  const rate = display.rate.toLocaleString(locale, {
    maximumFractionDigits: 4,
  });
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
