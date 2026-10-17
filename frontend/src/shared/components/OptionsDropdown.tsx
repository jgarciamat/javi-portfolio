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

/**
 * Small list of actions behind a toggle (a disclosure: plain buttons, Tab moves through
 * them). Closes on choice, outside click or Escape; the last two give focus back to the toggle.
 */
export function OptionsDropdown({ options, ariaLabel }: OptionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  const closeToToggle = () => {
    close();
    toggle.current!.focus();
  };
  useClickOutside(ref, close, open);
  useEscapeKey(closeToToggle, open);

  return (
    <div className="options-dropdown" ref={ref}>
      <button
        ref={toggle}
        type="button"
        className={`options-dropdown-toggle${open ? ' options-dropdown-toggle--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
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
        <ul className="options-dropdown-menu">
          {options.map((opt) => (
            <li key={opt.label}>
              <button
                type="button"
                className="options-dropdown-item"
                onClick={() => {
                  closeToToggle();
                  opt.onClick();
                }}
              >
                {opt.icon && (
                  <span className="options-dropdown-item-icon" aria-hidden="true">
                    {opt.icon}
                  </span>
                )}
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
