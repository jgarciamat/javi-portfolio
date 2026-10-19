import { useEffect, type RefObject } from 'react';

/**
 * Puts the height of the app's sticky header in a CSS property of `ref`, so something sticky
 * inside a section can sit right under it, whatever the header's height is.
 */
export function useHeaderOffset(ref: RefObject<HTMLElement | null>, property: string) {
  useEffect(() => {
    const update = () => {
      const header = document.querySelector('.dashboard-sticky');
      const height = header ? header.getBoundingClientRect().height : 0;
      (ref.current as HTMLElement).style.setProperty(property, `${height}px`);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref, property]);
}
