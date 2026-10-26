import { useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useDialog } from '@shared/hooks/useDialog';
import { STICKY_BAR_HEIGHT } from '@shared/hooks/useStickyBar';
import type { DashboardTab } from '../navigation';
import type { TourStep } from './tourSteps';
import '../css/GuidedTour.css';
import { scrollBehavior } from '@shared/utils/motion';

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
/** Size of the card before it is shown (as wide as the stylesheet makes it). */
const CARD_WIDTH = 380;
const CARD_HEIGHT = 340;
/** Room kept between the card and the sides of the screen. */
const EDGE = 16;
/** Narrower screens always get the card at the bottom. */
const MOBILE_WIDTH = 640;

/** Width the page can use: without the vertical scroll bar, which would hide the card's edge. */
function screenWidth(): number {
  return document.documentElement.clientWidth || window.innerWidth;
}

/** Part of the element inside the free area (big sections are clipped to what the card leaves). */
function visibleRect(element: Element, inset: number): Rect {
  const r = element.getBoundingClientRect();
  const top = Math.max(r.top, 0);
  const left = Math.max(r.left, 0);
  const bottom = Math.min(r.bottom, window.innerHeight - inset);
  const right = Math.min(r.right, screenWidth());
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
  // The app publishes the height of its fixed top bar; the scan below also finds other pinned bars.
  const published = parseFloat(
    document.documentElement.style.getPropertyValue(STICKY_BAR_HEIGHT) || '0'
  );
  let bottom = Number.isFinite(published) ? published : 0;
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

/**
 * Space the card takes at the bottom of the screen: always on phones; on larger screens only when
 * the element leaves no room next to it (then the card goes to the bottom and the element is
 * clipped above it). 0 when the card sits right below or above the element.
 */
function bottomInset(card: RefObject<HTMLDivElement | null>, element: Element): number {
  const height = (card.current as HTMLDivElement).getBoundingClientRect().height;
  if (window.innerWidth < MOBILE_WIDTH) return height + CARD_MARGIN;
  const r = element.getBoundingClientRect();
  const room = PADDING + GAP + height;
  const fitsBelow = Math.min(r.bottom, window.innerHeight) + room <= window.innerHeight;
  const fitsAbove = Math.max(r.top, 0) - room >= 0;
  return fitsBelow || fitsAbove ? 0 : height + CARD_MARGIN;
}

/** Rectangle of the step's target, followed through scrolls, resizes and lazy loading. */
function useTargetRect(
  target: string | undefined,
  /** Measured again on every step, even when two steps share the target (their cards differ in height). */
  stepId: string,
  card: RefObject<HTMLDivElement | null>
): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    setRect(null);
    if (!target) return;
    const selector = target;
    let element: Element | null = null;
    let timer = 0;
    let observer: ResizeObserver | null = null;
    let page: ResizeObserver | null = null;
    const started = Date.now();
    const measure = () => {
      if (element) setRect(visibleRect(element, bottomInset(card, element)));
    };
    /** Scrolls it into the part of the screen the pinned bars and the card leave free. */
    const bringIntoView = (target: Element) => {
      const html = target as HTMLElement;
      // The page keeps it on screen; only the box it scrolls in (the side menu) may need moving.
      if (isPinned(target)) {
        html.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
        return;
      }
      const top = pinnedTop() + TOP_GAP;
      const inset = bottomInset(card, target);
      const free = window.innerHeight - top - inset;
      // The page already keeps `scroll-padding-top` under its fixed bar: only add the rest.
      const padding = parseFloat(
        window.getComputedStyle(document.documentElement).scrollPaddingTop
      );
      html.style.scrollMarginTop = `${Math.max(top - (padding || 0), 0)}px`;
      html.style.scrollMarginBottom = `${inset}px`;
      html.scrollIntoView({
        block: target.getBoundingClientRect().height > free * 0.9 ? 'start' : 'center',
        behavior: scrollBehavior(),
      });
    };
    const find = () => {
      // The first one on screen: the same target can be in the side bar and in the header.
      element =
        Array.from(document.querySelectorAll(selector)).find((node) => {
          const size = node.getBoundingClientRect();
          return size.width > 0 && size.height > 0;
        }) ?? null;
      if (element) {
        const found = element;
        bringIntoView(found);
        measure();
        timer = window.setTimeout(measure, SETTLE_MS);
        // Sections fill in after they open: follow the element when it grows or shrinks.
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(measure);
          observer.observe(found);
          // The card too: its size changes with the text of the step and with the contrast mode.
          observer.observe(card.current as HTMLDivElement);
          // What loads above it pushes it away: when the page grows or shrinks, bring it back.
          page = new ResizeObserver(() => {
            bringIntoView(found);
            measure();
          });
          page.observe(document.body);
        }
      } else if (Date.now() - started < WAIT_MS) {
        timer = window.setTimeout(find, POLL_MS);
      }
    };
    find();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      page?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      if (element) {
        (element as HTMLElement).style.scrollMarginTop = '';
        (element as HTMLElement).style.scrollMarginBottom = '';
      }
    };
  }, [target, stepId, card]);

  return rect;
}

/** The real size of the card (its text changes from step to step); a guess before it is shown. */
function cardSize(card: HTMLDivElement | null): { width: number; height: number } {
  const size = card?.getBoundingClientRect();
  return { width: size?.width || CARD_WIDTH, height: size?.height || CARD_HEIGHT };
}

/** Next to the highlighted element when it fits; otherwise the stylesheet places the card. */
function anchoredStyle(rect: Rect | null, card: HTMLDivElement | null): CSSProperties | undefined {
  if (!rect || window.innerWidth < MOBILE_WIDTH) return undefined;
  const { width: cardWidth, height: cardHeight } = cardSize(card);
  // Lined up with the element, but always whole on the screen, on both sides.
  const left = Math.max(Math.min(rect.left, screenWidth() - cardWidth - EDGE), EDGE);
  const below = rect.top + rect.height + PADDING + GAP;
  if (below + cardHeight <= window.innerHeight) return { top: below, left };
  const above = rect.top - PADDING - GAP - cardHeight;
  if (above >= 0) return { top: above, left };
  return undefined;
}

/** What the step highlights on this screen: on phones, the smaller part when it names one. */
function targetOf(step: TourStep): string | undefined {
  return (window.innerWidth < MOBILE_WIDTH && step.phoneTarget) || step.target;
}

interface GuidedTourProps {
  steps: TourStep[];
  /** Opens the section a step talks about. */
  onShowTab: (tab: DashboardTab) => void;
  /** `dontShowAgain`: whether "don't show again" is ticked when the tour ends. */
  onClose: (dontShowAgain: boolean) => void;
  initialDontShowAgain: boolean;
  /** The guide of one section: no «don't show again» (it never opens by itself). */
  guide?: boolean;
}

/**
 * Step-by-step walk through the app: dims the screen, highlights the part being
 * explained and opens each section on the way. Keyboard: arrows to move, Esc to leave.
 */
export function GuidedTour({
  steps,
  onShowTab,
  onClose,
  initialDontShowAgain,
  guide = false,
}: GuidedTourProps) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(initialDontShowAgain);
  const card = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const step = steps[index];
  const last = index === steps.length - 1;
  const rect = useTargetRect(targetOf(step), step.id, card);
  const close = () => onClose(dontShowAgain);
  useDialog(card, close, true);

  // Short pages cannot scroll their last section above the card: give them room while it is open.
  useEffect(() => {
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

  const style = anchoredStyle(rect, card.current);
  const placement = style ? '' : rect ? ' tour-card--bottom' : ' tour-card--center';
  // On phones the «don't show again» box only shows on the first and last steps (room for the element).
  const edge = index === 0 || last ? ' tour-card--edge' : '';

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
        className={`tour-card${placement}${edge}`}
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
        {!guide && (
          <label className="tour-dont-show">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            {t('app.tour.dontShowAgain')}
          </label>
        )}
        <div className="tour-actions">
          {!last && (
            <button type="button" className="tour-skip tour-btn" onClick={close}>
              {t(guide ? 'app.tour.closeGuide' : 'app.tour.skip')}
            </button>
          )}
          <div className="tour-nav">
            <button
              type="button"
              className="btn-secondary tour-btn"
              onClick={prev}
              disabled={index === 0}
            >
              {t('app.tour.prev')}
            </button>
            <button type="button" className="btn-primary tour-btn" onClick={next}>
              {last ? t('app.tour.finish') : t('app.tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
