import { useRef, useState } from 'react';
import { useClickOutside } from '@shared/hooks/useClickOutside';
import { useEscapeKey } from '@shared/hooks/useEscapeKey';
import './css/OptionsDropdown.css';

export interface DropdownOption {
  label: string;
  icon?: string;
  onClick: () => void;
}

interface OptionsDropdownProps {
  options: DropdownOption[];
  /** Accessible name of the toggle button. */
  ariaLabel: string;
}

/** Small menu of actions; closes on choice, outside click or Escape. */
export function OptionsDropdown({ options, ariaLabel }: OptionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useClickOutside(ref, close, open);
  useEscapeKey(close, open);

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
        <svg
          className="options-dropdown-chevron"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul className="options-dropdown-menu" role="menu">
          {options.map((opt) => (
            <li key={opt.label} role="none">
              <button
                type="button"
                role="menuitem"
                className="options-dropdown-item"
                onClick={() => {
                  close();
                  opt.onClick();
                }}
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
