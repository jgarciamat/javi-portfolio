import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Open dialogs, innermost last: only that one reacts to the keyboard. */
const openDialogs: HTMLElement[] = [];

/** Tab and Shift+Tab wrap around the dialog's ends and bring back focus that escaped it. */
function trapTab(panel: HTMLElement, e: KeyboardEvent): void {
  const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
  const first = items[0] ?? panel;
  const last = items[items.length - 1] ?? panel;
  const active = document.activeElement;
  const atEdge = e.shiftKey ? active === first || active === panel : active === last;
  if (atEdge || !panel.contains(active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  }
}

/**
 * Keyboard and focus behaviour of a modal dialog: focus moves into it on open
 * (unless a field took it with autoFocus) and goes back to where it was on close,
 * Tab stays inside, and Escape closes it while `dismissible`.
 */
export function useDialog(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  dismissible: boolean
): void {
  const close = useRef(onClose);
  close.current = onClose;
  const canDismiss = useRef(dismissible);
  canDismiss.current = dismissible;

  useEffect(() => {
    const panel = panelRef.current!;
    const previous = document.activeElement as HTMLElement;
    // Mounted together, the inner dialog's effect runs first: keep it after its container.
    const inner = openDialogs.findIndex((dialog) => panel.contains(dialog));
    openDialogs.splice(inner === -1 ? openDialogs.length : inner, 0, panel);
    // Not the first field: on mobile that would open the keyboard over the dialog.
    if (!panel.contains(previous)) panel.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== panel) return;
      if (e.key === 'Tab') trapTab(panel, e);
      else if (e.key === 'Escape' && canDismiss.current) close.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openDialogs.splice(openDialogs.indexOf(panel), 1);
      previous.focus();
    };
  }, [panelRef]);
}
