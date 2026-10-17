/** Smooth scrolling, unless the device asks for less motion. */
export function scrollBehavior(): ScrollBehavior {
  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduce ? 'auto' : 'smooth';
}
