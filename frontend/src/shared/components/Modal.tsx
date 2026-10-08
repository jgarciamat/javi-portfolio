import { useRef, type ReactNode } from 'react';
import { useDialog } from '@shared/hooks/useDialog';

interface ModalProps {
  /** Accessible name of the dialog. */
  label: string;
  onClose: () => void;
  children: ReactNode;
  /** Escape and a click on the backdrop close it (off while saving). */
  dismissible?: boolean;
  overlayClassName?: string;
  className?: string;
}

/**
 * Dialog with a backdrop. The backdrop reacts to mouse *down* so that selecting
 * text inside the dialog and releasing outside does not close it. Focus and
 * keyboard handling (also for nested dialogs) live in `useDialog`.
 */
export function Modal({
  label,
  onClose,
  children,
  dismissible = true,
  overlayClassName = 'modal-overlay',
  className = 'modal-panel',
}: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  useDialog(panel, onClose, dismissible);

  return (
    <div
      className={overlayClassName}
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
