import { useState, useRef, useEffect } from 'react';
import './OptionsDropdown.css';

export interface DropdownOption {
    label: string;
    icon?: string;
    onClick: () => void;
}

interface OptionsDropdownProps {
    options: DropdownOption[];
    /** aria-label for the toggle button */
    ariaLabel?: string;
}

export function OptionsDropdown({ options, ariaLabel = 'Opciones' }: OptionsDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open]);

    return (
        <div className="options-dropdown" ref={ref}>
            <button
                type="button"
                className={`options-dropdown-toggle${open ? ' options-dropdown-toggle--open' : ''}`}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={ariaLabel}
            >
                <svg className="options-dropdown-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <ul className="options-dropdown-menu" role="menu">
                    {options.map((opt, i) => (
                        <li key={i} role="none">
                            <button
                                type="button"
                                role="menuitem"
                                className="options-dropdown-item"
                                onClick={() => { opt.onClick(); setOpen(false); }}
                            >
                                {opt.icon && <span className="options-dropdown-item-icon">{opt.icon}</span>}
                                {opt.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
