import { useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from 'react';
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
/** Gap kept between whatever the page pins to the top and the highlighted element. */
const TOP_GAP = 12;
/** Breathing room between the highlighted element and the card on phones. */
const CARD_MARGIN = 24;
/** Pinned bars are looked for in this top part of the screen. */
const PINNED_ZONE = 250;
const CARD_WIDTH = 360;
const CARD_HEIGHT = 290;
/** Narrower screens always get the card at the bottom. */
const MOBILE_WIDTH = 640;

/** Part of the element inside the free area (big sections are clipped to what the card leaves). */
function visibleRect(element: Element, inset: number): Rect {
  const r = element.getBoundingClientRect();
  const top = Math.max(r.top, 0);
  const left = Math.max(r.left, 0);
  const bottom = Math.min(r.bottom, window.innerHeight - inset);
  const right = Math.min(r.right, window.innerWidth);
  return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
}

/** Whether the page keeps the element on screen by itself (header buttons, sticky bars). */
function isPinned(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const { position } = window.getComputedStyle(node);
    if (position === 'fixed' || position === 'sticky') return true;
  }
  return false;
}

/** Bottom edge of what the page pins to the top of the screen (header, month bar…). */
function pinnedTop(): number {
  let bottom = 0;
  document.body.querySelectorAll('*').forEach((node) => {
    const { position } = window.getComputedStyle(node);
    if ((position !== 'fixed' && position !== 'sticky') || node.closest('.tour-root')) return;
    const r = node.getBoundingClientRect();
    // A bar is wide and short: full-screen overlays and side panels are not.
    const isBar = r.width > window.innerWidth / 2 && r.height < window.innerHeight / 2;
    if (r.top < PINNED_ZONE && isBar) bottom = Math.max(bottom, r.bottom);
  });
  return bottom;
}

/** Space the card takes at the bottom of a phone screen (0 when it sits next to the element). */
function bottomInset(card: RefObject<HTMLDivElement | null>): number {
  if (window.innerWidth >= MOBILE_WIDTH) return 0;
  return (card.current as HTMLDivElement).getBoundingClientRect().height + CARD_MARGIN;
}

/** Rectangle of the step's target, followed through scrolls, resizes and lazy loading. */
function useTargetRect(
  target: string | undefined,
  card: RefObject<HTMLDivElement | null>
): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    setRect(null);
    if (!target) return;
    const selector = target;
    let element: Element | null = null;
    let timer = 0;
    const started = Date.now();
    const measure = () => {
      if (element) setRect(visibleRect(element, bottomInset(card)));
    };
    const find = () => {
      element = document.querySelector(selector);
      const size = element?.getBoundingClientRect();
      if (element && size && size.width > 0 && size.height > 0) {
        // Scroll it into the part of the screen the pinned bars and the card leave free.
        if (!isPinned(element)) {
          const html = element as HTMLElement;
          const top = pinnedTop() + TOP_GAP;
          const inset = bottomInset(card);
          const free = window.innerHeight - top - inset;
          html.style.scrollMarginTop = `${top}px`;
          html.style.scrollMarginBottom = `${inset}px`;
          html.scrollIntoView({
            block: size.height > free * 0.9 ? 'start' : 'center',
            behavior: 'smooth',
          });
        }
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
      if (element) {
        (element as HTMLElement).style.scrollMarginTop = '';
        (element as HTMLElement).style.scrollMarginBottom = '';
      }
    };
  }, [target, card]);

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
  const rect = useTargetRect(step.target, card);
  const close = () => onClose(dontShowAgain);
  useDialog(card, close, true);

  // Short pages cannot scroll their last section above the card: give them room while it is open.
  useEffect(() => {
    if (window.innerWidth >= MOBILE_WIDTH) return;
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${CARD_HEIGHT + CARD_MARGIN}px`;
    return () => {
      document.body.style.paddingBottom = previous;
    };
  }, []);

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
