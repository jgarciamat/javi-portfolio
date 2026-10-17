import { useState, type Ref } from 'react';
import { useI18n } from '@core/i18n/I18nContext';

interface AuthPasswordInputProps {
  /** Set when a visible <label htmlFor> names the field; otherwise the placeholder does. */
  id?: string;
  /** Id of the hint or error that explains the field. */
  describedBy?: string;
  inputRef?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Marks the field as wrong (e.g. confirmation that does not match). */
  invalid?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: 'current-password' | 'new-password';
}

/** Password field with a button to show / hide what was typed. */
export function AuthPasswordInput({
  id,
  describedBy,
  inputRef,
  value,
  onChange,
  placeholder,
  invalid = false,
  required = true,
  autoFocus,
  autoComplete = 'new-password',
}: AuthPasswordInputProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-pass-wrap">
      <input
        id={id}
        ref={inputRef}
        className={`auth-input auth-pass-input${invalid ? ' auth-input-error' : ''}`}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        aria-label={id ? undefined : placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="auth-eye"
        onClick={() => setVisible((v) => !v)}
        aria-label={t(visible ? 'app.auth.login.hidePassword' : 'app.auth.login.showPassword')}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  );
}
