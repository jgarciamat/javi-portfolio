import { useI18n } from '@core/i18n/I18nContext';
import type { usePasswordSection } from '../application/useProfileSections';

type PasswordSectionProps = ReturnType<typeof usePasswordSection>;

interface PasswordInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    show: boolean;
    onToggle: () => void;
    placeholder: string;
    showLabel: string;
    hideLabel: string;
    errorClass?: string;
    style?: React.CSSProperties;
}

function PasswordInput({ value, onChange, show, onToggle, placeholder, showLabel, hideLabel, errorClass, style }: PasswordInputProps) {
    return (
        <div className="auth-pass-wrap" style={style}>
            <input
                className={`auth-input auth-pass-input${errorClass ? ` ${errorClass}` : ''}`}
                type={show ? 'text' : 'password'}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required
            />
            <button type="button" className="auth-eye" onClick={onToggle} aria-label={show ? hideLabel : showLabel}>
                {show ? '🙈' : '👁️'}
            </button>
        </div>
    );
}

export function PasswordSection({
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmNewPassword, setConfirmNewPassword,
    showCurrent, setShowCurrent,
    showNew, setShowNew,
    passLoading, passMsg,
    newPassValidation, newPassMatch,
    handlePasswordSubmit,
}: PasswordSectionProps) {
    const { t } = useI18n();
    const eyeLabels = { show: t('app.auth.login.showPassword'), hide: t('app.auth.login.hidePassword') };

    return (
        <form className="profile-section" onSubmit={handlePasswordSubmit}>
            <label className="profile-label">{t('app.profile.password.label')}</label>

            <PasswordInput
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                show={showCurrent}
                onToggle={() => setShowCurrent(v => !v)}
                placeholder={t('app.profile.password.current')}
                showLabel={eyeLabels.show}
                hideLabel={eyeLabels.hide}
            />

            <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                show={showNew}
                onToggle={() => setShowNew(v => !v)}
                placeholder={t('app.profile.password.new')}
                showLabel={eyeLabels.show}
                hideLabel={eyeLabels.hide}
                style={{ marginTop: '0.5rem' }}
            />

            {newPassword.length > 0 && !newPassValidation.valid && (
                <ul className="auth-password-hints">
                    {newPassValidation.errors.map((e) => (
                        <li key={e} className="auth-hint-error">✗ {e}</li>
                    ))}
                </ul>
            )}

            <input
                className={`auth-input${confirmNewPassword.length > 0 && !newPassMatch ? ' auth-input-error' : ''}`}
                type="password"
                placeholder={t('app.profile.password.confirm')}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                style={{ marginTop: '0.5rem' }}
            />
            {confirmNewPassword.length > 0 && !newPassMatch && (
                <p className="auth-hint-error">{t('app.profile.password.noMatch')}</p>
            )}

            {passMsg && (
                <p className={passMsg.ok ? 'profile-msg-ok' : 'auth-error'}>{passMsg.text}</p>
            )}

            <button type="submit" className="btn-primary" disabled={passLoading}>
                {passLoading ? t('app.profile.password.saving') : t('app.profile.password.save')}
            </button>
        </form>
    );
}
