import { useEffect, type RefObject } from 'react';

/**
 * Tells `onScreen` whether the element is in the viewport (the chart, also in full screen where
 * it is the element shown, or the open trades); without IntersectionObserver it counts as on
 * screen. Off when it goes.
 */
export function useOnScreen(
  root: RefObject<HTMLElement | null>,
  onScreen?: (visible: boolean) => void
) {
  useEffect(() => {
    if (!onScreen) return;
    if (typeof IntersectionObserver === 'undefined') {
      onScreen(true);
      return () => onScreen(false);
    }
    const observer = new IntersectionObserver((entries) =>
      onScreen(entries[entries.length - 1].isIntersecting)
    );
    observer.observe(root.current!);
    return () => {
      observer.disconnect();
      onScreen(false);
    };
  }, [root, onScreen]);
}
