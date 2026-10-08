import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useDialog } from '@shared/hooks/useDialog';
import type { DashboardTab } from '../navigation';
import type { TourStep } from './tourSteps';
import '../css/GuidedTour.css';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Sections arrive as separate chunks: give their content time to show up. */
const WAIT_MS = 3000;
const POLL_MS = 100;
/** Measure again once the smooth scroll has settled. */
const SETTLE_MS = 450;
const PADDING = 8;
const GAP = 14;
const CARD_WIDTH = 360;
const CARD_HEIGHT = 290;
/** Narrower screens always get the card at the bottom. */
const MOBILE_WIDTH = 640;

/** Part of the element inside the viewport (big sections are clipped to the screen). */
function visibleRect(element: Element): Rect {
  const r = element.getBoundingClientRect();
  const top = Math.max(r.top, 0);
  const left = Math.max(r.left, 0);
  const bottom = Math.min(r.bottom, window.innerHeight);
  const right = Math.min(r.right, window.innerWidth);
  return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
}

/** Rectangle of the step's target, followed through scrolls, resizes and lazy loading. */
function useTargetRect(target: string | undefined): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    setRect(null);
    if (!target) return;
    const selector = target;
    let element: Element | null = null;
    let timer = 0;
    const started = Date.now();
    const measure = () => {
      if (element) setRect(visibleRect(element));
    };
    const find = () => {
      element = document.querySelector(selector);
      if (element) {
        const tall = element.getBoundingClientRect().height > window.innerHeight * 0.6;
        element.scrollIntoView({ block: tall ? 'start' : 'center', behavior: 'smooth' });
        measure();
        timer = window.setTimeout(measure, SETTLE_MS);
      } else if (Date.now() - started < WAIT_MS) {
        timer = window.setTimeout(find, POLL_MS);
      }
    };
    find();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [target]);

  return rect;
}

/** Next to the highlighted element when it fits; otherwise the stylesheet places the card. */
function anchoredStyle(rect: Rect | null): CSSProperties | undefined {
  if (!rect || window.innerWidth < MOBILE_WIDTH) return undefined;
  const left = Math.min(Math.max(rect.left, 16), window.innerWidth - CARD_WIDTH - 16);
  const below = rect.top + rect.height + PADDING + GAP;
  if (below + CARD_HEIGHT <= window.innerHeight) return { top: below, left };
  const above = rect.top - PADDING - GAP - CARD_HEIGHT;
  if (above >= 0) return { top: above, left };
  return undefined;
}

interface GuidedTourProps {
  steps: TourStep[];
  /** Opens the section a step talks about. */
  onShowTab: (tab: DashboardTab) => void;
  /** `dontShowAgain`: whether "don't show again" is ticked when the tour ends. */
  onClose: (dontShowAgain: boolean) => void;
  initialDontShowAgain: boolean;
}

/**
 * Step-by-step walk through the app: dims the screen, highlights the part being
 * explained and opens each section on the way. Keyboard: arrows to move, Esc to leave.
 */
export function GuidedTour({ steps, onShowTab, onClose, initialDontShowAgain }: GuidedTourProps) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(initialDontShowAgain);
  const card = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const step = steps[index];
  const last = index === steps.length - 1;
  const rect = useTargetRect(step.target);
  const close = () => onClose(dontShowAgain);
  useDialog(card, close, true);

  useEffect(() => {
    if (step.tab) onShowTab(step.tab);
  }, [step, onShowTab]);

  const next = () => (last ? close() : setIndex(index + 1));
  const prev = () => setIndex(Math.max(index - 1, 0));

  const style = anchoredStyle(rect);
  const placement = style ? '' : rect ? ' tour-card--bottom' : ' tour-card--center';

  return (
    <div className="tour-root">
      <div className={`tour-backdrop${rect ? '' : ' tour-backdrop--dim'}`} />
      {rect && (
        <div
          className="tour-spotlight"
          aria-hidden="true"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
          }}
        />
      )}
      <div
        ref={card}
        className={`tour-card${placement}`}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') next();
          if (e.key === 'ArrowLeft') prev();
        }}
      >
        <p className="tour-progress">
          {t('app.tour.progress', { current: index + 1, total: steps.length })}
        </p>
        <div className="tour-progress-bar" aria-hidden="true">
          <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <h2 id={titleId} className="tour-title">
          {t(`app.tour.${step.id}.title`)}
        </h2>
        <p id={bodyId} className="tour-body" aria-live="polite">
          {t(`app.tour.${step.id}.body`)}
        </p>
        <label className="tour-dont-show">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          {t('app.tour.dontShowAgain')}
        </label>
        <div className="tour-actions">
          {!last && (
            <button type="button" className="tour-skip" onClick={close}>
              {t('app.tour.skip')}
            </button>
          )}
          <div className="tour-nav">
            <button type="button" className="btn-secondary" onClick={prev} disabled={index === 0}>
              {t('app.tour.prev')}
            </button>
            <button type="button" className="btn-primary" onClick={next}>
              {last ? t('app.tour.finish') : t('app.tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
