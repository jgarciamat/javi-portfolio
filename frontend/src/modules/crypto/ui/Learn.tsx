import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { lazyNamed } from '@shared/utils/lazyNamed';
import type { GuideTab } from '../domain/guide';
import './css/Learn.css';

// The tabs and their drawings are only downloaded when the person opens the panel.
const GuidePanel = lazyNamed(() => import('./GuidePanel'), 'GuidePanel');

/** One panel per console: the button above the chart and the panel below it point to it. */
const PANEL_ID = 'cc-learn';

export interface Guide {
  open: boolean;
  tab: GuideTab;
  /** Grows every time the panel opens, so it comes into sight again. */
  opened: number;
  /** Opens the panel on a tab (the glossary buttons, for instance). */
  show: (tab: GuideTab) => void;
  toggle: () => void;
  close: () => void;
  choose: (tab: GuideTab) => void;
}

/** Whether «Learn before playing» is open, and on which tab. */
export function useGuide(): Guide {
  const [state, setState] = useState({ open: false, tab: 'candles' as GuideTab, opened: 0 });
  const show = useCallback(
    (tab: GuideTab) => setState((s) => ({ open: true, tab, opened: s.opened + 1 })),
    []
  );
  const toggle = useCallback(
    () =>
      setState((s) =>
        s.open ? { ...s, open: false } : { ...s, open: true, opened: s.opened + 1 }
      ),
    []
  );
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const choose = useCallback((tab: GuideTab) => setState((s) => ({ ...s, tab })), []);
  return { ...state, show, toggle, close, choose };
}

/** An open book, drawn with lines. */
export function BookIcon() {
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

/** «Learn before playing»: the small accent button at the end of the layer chips. */
export function LearnButton({ guide }: { guide: Guide }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="cc-learn-open"
      aria-expanded={guide.open}
      aria-controls={PANEL_ID}
      title={t('app.crypto.layers.note')}
      onClick={guide.toggle}
    >
      <BookIcon />
      {t('app.crypto.guide.open')}
    </button>
  );
}

/** Puts the focus back on the button that opens the panel, if it is on screen. */
const focusOpener = () =>
  document.querySelector<HTMLElement>(`[aria-controls="${PANEL_ID}"]`)?.focus();

/**
 * «Before you start playing, learn all about crypto analysis»: a panel that unfolds below the
 * chart with the guide in tabs. It closes with its button or with Esc, and while closed it is
 * out of reach of the keyboard and of screen readers.
 */
export function LearnPanel({ guide, premium }: { guide: Guide; premium: boolean }) {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(guide.open);
  const title = useRef<HTMLHeadingElement>(null);
  if (guide.open && !loaded) setLoaded(true);
  const { open, opened, close } = guide;

  // Every opening brings the panel into sight and leaves the focus on its title.
  useEffect(() => {
    if (!opened) return;
    const heading = title.current!;
    void heading.scrollIntoView?.({ block: 'start' });
    heading.focus({ preventScroll: true });
  }, [opened]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      close();
      focusOpener();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <section
      id={PANEL_ID}
      className={`cc-learn${open ? ' is-open' : ''}`}
      aria-labelledby={`${PANEL_ID}-title`}
      inert={!open}
    >
      <div className="cc-learn-clip">
        <div className="cc-learn-inner">
          <header className="cc-learn-head">
            <div>
              <p className="cc-learn-kicker">
                <BookIcon />
                {t('app.crypto.guide.open')}
              </p>
              <h2 id={`${PANEL_ID}-title`} ref={title} tabIndex={-1}>
                {t('app.crypto.guide.title')}
              </h2>
              <p className="cc-learn-sub">{t('app.crypto.layers.note')}</p>
            </div>
            <button
              type="button"
              className="cc-learn-close"
              onClick={() => {
                close();
                focusOpener();
              }}
            >
              {t('app.crypto.guide.close')}
            </button>
          </header>
          <p className="cc-guide-note">{t('app.crypto.guide.note')}</p>
          {loaded && (
            <Suspense fallback={null}>
              <GuidePanel tab={guide.tab} premium={premium} onTab={guide.choose} />
            </Suspense>
          )}
        </div>
      </div>
    </section>
  );
}
