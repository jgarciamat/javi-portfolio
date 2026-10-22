import { useId, useState } from 'react';
import { useI18n, type Locale } from '@core/i18n/I18nContext';
import { formatDateTime } from '../domain/format';
import type { MarketStatus } from '../domain/types';

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

/** Where the prices come from and how fresh they are (they are orientative and delayed). */
export function DataNotice({ market }: { market: MarketStatus | null }) {
  const { t, locale } = useI18n();
  const { text, warn } = freshness(market, t, locale);
  return (
    <p className={`cc-data${warn ? ' cc-data--warn' : ''}`}>
      <span>{t('app.crypto.data.delayed')}</span>{' '}
      <span>
        {market?.source === 'demo' ? t('app.crypto.data.demo') : t('app.crypto.data.source')}
      </span>{' '}
      <span role="status">{text}</span>
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

export const GLOSSARY_TERMS = [
  'candle',
  'interval',
  'volume',
  'long',
  'short',
  'market',
  'limit',
  'stop',
  'takeProfit',
  'stopLoss',
  'fee',
  'reserved',
  'unrealized',
  'realized',
  'winRate',
  'pending',
] as const;

/** Every word of the console explained, for whoever wants to read them all at once. */
export function Glossary() {
  const { t } = useI18n();
  return (
    <section className="card cc-glossary" aria-labelledby="cc-glossary-title">
      <h2 id="cc-glossary-title" className="section-title">
        {t('app.crypto.glossary.title')}
      </h2>
      <dl>
        {GLOSSARY_TERMS.map((term) => (
          <div key={term}>
            <dt>{t(`app.crypto.glossary.${term}.term`)}</dt>
            <dd>{t(`app.crypto.glossary.${term}.text`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
