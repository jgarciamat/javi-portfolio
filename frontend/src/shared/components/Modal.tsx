import type { ReactNode } from 'react';
import { useEscapeKey } from '@shared/hooks/useEscapeKey';

interface ModalProps {
  /** Accessible name of the dialog. */
  label: string;
  onClose: () => void;
  children: ReactNode;
  /** Escape and a click on the backdrop close it (off while saving, or under a nested modal). */
  dismissible?: boolean;
  overlayClassName?: string;
  className?: string;
}

/**
 * Dialog with a backdrop. The backdrop reacts to mouse *down* so that selecting
 * text inside the dialog and releasing outside does not close it.
 */
export function Modal({
  label,
  onClose,
  children,
  dismissible = true,
  overlayClassName = 'modal-overlay',
  className = 'modal-panel',
}: ModalProps) {
  useEscapeKey(onClose, dismissible);

  return (
    <div
      className={overlayClassName}
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={className} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
