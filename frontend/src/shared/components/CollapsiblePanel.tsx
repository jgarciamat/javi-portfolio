import { useState, useRef, useEffect, type ReactNode } from 'react';
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
    const bodyRef = useRef<HTMLDivElement>(null);

    // Animate max-height for smooth expand/collapse
    useEffect(() => {
        const el = bodyRef.current;
        /* istanbul ignore next */
        if (!el) return;
        if (open) {
            el.style.maxHeight = el.scrollHeight + 'px';
        } else {
            el.style.maxHeight = '0px';
        }
    }, [open]);

    // Recalculate after children change (e.g. new transactions added)
    useEffect(() => {
        const el = bodyRef.current;
        /* istanbul ignore next */
        if (!el || !open) return;
        el.style.maxHeight = el.scrollHeight + 'px';
    });

    return (
        <div className={`card collapsible-panel${className ? ` ${className}` : ''}`} style={style}>
            <button
                className={`collapsible-header${open ? ' collapsible-header--open' : ''}`}
                onClick={() => onToggle ? onToggle() : setOpenInternal((v) => !v)}
                aria-expanded={open}
            >
                <span className="collapsible-title">{title}</span>
                <span className="collapsible-chevron" aria-hidden="true">›</span>
            </button>
            <div
                ref={bodyRef}
                className="collapsible-body"
                style={{ maxHeight: defaultOpen ? undefined : '0px' }}
            >
                <div className="collapsible-body-inner">{children}</div>
            </div>
        </div>
    );
}
