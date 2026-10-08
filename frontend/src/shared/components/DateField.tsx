import { useRef } from 'react';
import { useFormat } from '@core/settings/SettingsContext';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

/**
 * Date input that shows the date in the user's language ("4 mar 2026") and opens
 * the native picker on click, Enter or Space.
 */
export function DateField({ value, onChange, label, className = '' }: DateFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const { date } = useFormat();
  const open = () => input.current?.showPicker?.();

  return (
    <div
      className={`tx-input tx-date-display ${className}`.trim()}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      aria-label={label}
    >
      <span className="tx-date-icon">📅</span>
      <span>{value ? date(value) : ''}</span>
      <input
        ref={input}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tx-date-hidden-input"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
