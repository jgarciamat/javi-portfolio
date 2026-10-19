import type { ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFileDrop } from '../hooks/useFileDrop';
import './css/FileDropZone.css';

interface FileDropZoneProps {
  children: ReactNode;
  /** The valid files that were dropped: pass the function the button already uses. */
  onFiles: (files: File[]) => void;
  /** Same as the `accept` of the file input inside. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Wraps a file button so that files can also be dropped on it. The button stays the main way in
 * (keyboard included); while a file is dragged over, the zone shows a dashed border and says so.
 */
export function FileDropZone({
  children,
  onFiles,
  accept,
  multiple,
  disabled,
  className,
}: FileDropZoneProps) {
  const { t } = useI18n();
  const { dragging, rejected, bind } = useFileDrop({ accept, multiple, disabled, onFiles });
  return (
    <div className={`file-drop-zone${dragging ? ' is-over' : ''} ${className ?? ''}`} {...bind}>
      {children}
      {dragging && (
        <div className="file-drop-overlay" aria-hidden="true">
          {t('app.drop.here')}
        </div>
      )}
      <div className="file-drop-status" aria-live="polite">
        {dragging && <span className="sr-only">{t('app.drop.here')}</span>}
        {!dragging && rejected.length > 0 && (
          <span className="form-error">
            {t('app.drop.rejected', { files: rejected.join(', ') })}
          </span>
        )}
      </div>
    </div>
  );
}
