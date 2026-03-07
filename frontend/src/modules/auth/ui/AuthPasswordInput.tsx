interface AuthPasswordInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    show: boolean;
    onToggle: () => void;
    placeholder: string;
    showLabel: string;
    hideLabel: string;
    errorClass?: string;
    required?: boolean;
    autoFocus?: boolean;
}

export function AuthPasswordInput({ value, onChange, show, onToggle, placeholder, showLabel, hideLabel, errorClass, required, autoFocus }: AuthPasswordInputProps) {
    return (
        <div className="auth-pass-wrap">
            <input
                className={`auth-input auth-pass-input${errorClass ? ` ${errorClass}` : ''}`}
                type={show ? 'text' : 'password'}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                autoFocus={autoFocus}
            />
            <button type="button" className="auth-eye" onClick={onToggle} aria-label={show ? hideLabel : showLabel}>
                {show ? '🙈' : '👁️'}
            </button>
        </div>
    );
}
