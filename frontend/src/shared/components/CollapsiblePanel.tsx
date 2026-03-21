import { useState, type ReactNode } from 'react';
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
    style?: React.CSSProperties;
}

export function CollapsiblePanel({
    title,
    defaultOpen = true,
    open: openProp,
    onToggle,
    children,
    className,
    style,
}: CollapsiblePanelProps) {
    const [openInternal, setOpenInternal] = useState(defaultOpen);
    const open = openProp !== undefined ? openProp : openInternal;

    return (
        <div className={`card collapsible-panel${className ? ` ${className}` : ''}`} style={style}>
            <button
                className={`collapsible-header${open ? ' collapsible-header--open' : ''}`}
                onClick={() => onToggle ? onToggle() : setOpenInternal((v) => !v)}
                aria-expanded={open}
                title={open ? 'Contraer' : 'Expandir'}
            >
                <span className="collapsible-title">{title}</span>
                <span className="collapsible-chevron" aria-hidden="true">›</span>
            </button>
            <div className={`collapsible-body${open ? ' collapsible-body--open' : ''}`}>
                <div className="collapsible-body-inner">{children}</div>
            </div>
        </div>
    );
}
