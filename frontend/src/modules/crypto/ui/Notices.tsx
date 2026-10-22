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

/** An open book, drawn with lines. */
function BookIcon() {
  return (
    <svg className="cc-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 4.2C6.6 3 4.6 2.6 2 2.8v9.6c2.6-.2 4.6.2 6 1.4 1.4-1.2 3.4-1.6 6-1.4V2.8c-2.6-.2-4.6.2-6 1.4Zm0 0v9.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** «Learn all the key words»: opens the guide on its words section. */
export function GlossaryButton({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" className="cc-glossary-open" onClick={onOpen}>
      <BookIcon />
      {t('app.crypto.glossary.open')}
    </button>
  );
}
