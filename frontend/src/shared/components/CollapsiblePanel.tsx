import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import './css/CollapsiblePanel.css';

interface CollapsiblePanelProps {
  title: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state — if provided, the panel becomes controlled */
  open?: boolean;
  /** Called when the header toggle is clicked in controlled mode */
  onToggle?: () => void;
  children: ReactNode;
  /** Extra class applied to the outer .card wrapper */
  className?: string;
  /** Inline style applied to the outer .card wrapper */
  style?: CSSProperties;
  /** Anchor for the guided tour (`data-tour`). */
  tourId?: string;
}

export function CollapsiblePanel({
  title,
  defaultOpen = true,
  open: openProp,
  onToggle,
  children,
  className,
  style,
  tourId,
}: CollapsiblePanelProps) {
  const [openInternal, setOpenInternal] = useState(defaultOpen);
  const open = openProp ?? openInternal;
  const bodyId = useId();

  return (
    <div
      className={`card collapsible-panel${className ? ` ${className}` : ''}`}
      style={style}
      data-tour={tourId}
    >
      <button
        className={`collapsible-header${open ? ' collapsible-header--open' : ''}`}
        onClick={() => (onToggle ? onToggle() : setOpenInternal((v) => !v))}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-chevron" aria-hidden="true">
          ›
        </span>
      </button>
      <div id={bodyId} className={`collapsible-body${open ? ' collapsible-body--open' : ''}`}>
        <div className="collapsible-body-inner">{children}</div>
      </div>
    </div>
  );
}
