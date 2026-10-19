import { scrollBehavior } from '@shared/utils/motion';

/**
 * Scrolls an element into view and puts the focus on a control inside it (the first selector of
 * `focus` that finds one), so a keyboard or screen reader user lands where a warning sent them. False when the
 * element is not on the page.
 */
export function bringIntoView(id: string, focus: string[]): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  for (const selector of focus) {
    const control = target.querySelector<HTMLElement>(selector);
    if (control) {
      control.focus();
      break;
    }
  }
  return true;
}
