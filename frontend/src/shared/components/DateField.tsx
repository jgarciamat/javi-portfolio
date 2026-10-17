import { useRef } from 'react';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

/**
 * Date input that shows the date in the user's language ("4 mar 2026"): a button
 * named "Fecha: 4 mar 2026" opens the native picker. The native input sits beside
 * it, invisible but on top, so a tap on iOS also reaches it.
 */
export function DateField({ value, onChange, label, className = '' }: DateFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const { date } = useFormat();
  const open = () => input.current?.showPicker?.();
  const shown = value ? date(value) : '';

  return (
    <div className={`tx-input tx-date-display ${className}`.trim()}>
      <button
        type="button"
        className="tx-date-btn"
        onClick={open}
        aria-label={shown ? `${label}: ${shown}` : label}
      >
        <span className="tx-date-icon" aria-hidden="true">
          <Icon name="calendar" />
        </span>
        <span>{shown}</span>
      </button>
      <input
        ref={input}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={open}
        className="tx-date-hidden-input"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
