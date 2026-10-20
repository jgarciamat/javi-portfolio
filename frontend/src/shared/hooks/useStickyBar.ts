import { useEffect, useRef, type RefObject } from 'react';

/** CSS property on <html> that holds the height of the app's fixed top bar, in pixels. */
export const STICKY_BAR_HEIGHT = '--sticky-bar-height';

/**
 * Publishes the height of the fixed top bar in `--sticky-bar-height` (on <html>), kept up to date
 * when the bar changes size (month line, wrapped tabs, phone width, banners). The stylesheet uses it
 * as `scroll-padding-top`, so anything scrolled into view (scrollIntoView, #anchors, focus) stops
 * right under the bar instead of behind it.
 */
export function useStickyBarHeight(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const bar = ref.current as HTMLElement;
    const root = document.documentElement;
    const update = () => root.style.setProperty(STICKY_BAR_HEIGHT, `${bar.offsetHeight}px`);
    update();
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(bar);
    return () => {
      window.removeEventListener('resize', update);
      observer?.disconnect();
      root.style.removeProperty(STICKY_BAR_HEIGHT);
    };
  }, [ref]);
}

/**
 * Brings the page back to the top when the section (or the month) changes, so the content starts
 * right under the fixed bar instead of keeping the scroll position of the previous screen.
 */
export function useScrollToStart(...keys: Array<string | number>) {
  const first = useRef(true);
  const signature = keys.join('|');
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.scrollY > 0) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [signature]);
}
