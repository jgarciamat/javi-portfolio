import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { validatePassword } from '@modules/auth/domain/passwordValidation';
import { useI18n } from '@core/i18n/I18nContext';

interface Props {
    onClose: () => void;
}

export function ProfilePage({ onClose }: Props) {
    const { user, updateName, updatePassword, updateAvatar } = useAuth();
    const { t } = useI18n();

    // ── Name ─────────────────────────────────────────────────────────────────
    const [name, setName] = useState(user?.name ?? '');
    const [nameLoading, setNameLoading] = useState(false);
    const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const handleNameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setNameLoading(true);
        setNameMsg(null);
        try {
            await updateName(name);
            setNameMsg({ ok: true, text: t('app.profile.name.saved') });
        } catch (err) {
            setNameMsg({ ok: false, text: err instanceof Error ? err.message : t('app.profile.name.saved') });
        } finally {
            setNameLoading(false);
        }
    };

    // ── Password ──────────────────────────────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const newPassValidation = validatePassword(newPassword);
    const newPassMatch = newPassword === confirmNewPassword;

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassMsg(null);
        if (!newPassValidation.valid) {
            setPassMsg({ ok: false, text: newPassValidation.errors.join(' · ') });
            return;
        }
        if (!newPassMatch) {
            setPassMsg({ ok: false, text: t('app.profile.password.mismatch') });
            return;
        }
        setPassLoading(true);
        try {
            await updatePassword(currentPassword, newPassword);
            setPassMsg({ ok: true, text: t('app.profile.password.saved') });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            setPassMsg({ ok: false, text: err instanceof Error ? err.message : t('app.profile.password.saved') });
        } finally {
            setPassLoading(false);
        }
    };

    // ── Avatar ────────────────────────────────────────────────────────────────
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null);

    // Keep preview in sync with the saved avatar (e.g. after a successful save)
    useEffect(() => {
        setAvatarPreview(user?.avatarUrl ?? null);
    }, [user?.avatarUrl]);

    const PRESET_AVATARS = [
        '🧑', '👩', '👨', '🧔', '👩‍🦰', '👩‍🦱', '👩‍🦳', '👩‍🦲',
        '🧑‍💼', '👩‍💼', '🧑‍🎨', '👩‍🎨', '🧑‍🚀', '🦊', '🐼', '🐨',
        '🦁', '🐯', '🐸', '🦄', '🐙', '🤖', '👾', '🎃',
    ];

    const handlePresetSelect = useCallback((emoji: string) => {
        // Build a small SVG data URL wrapping the emoji so it works as an img src
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text y="50" x="8" font-size="48">${emoji}</text></svg>`;
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        setAvatarPreview(dataUrl);
        setAvatarMsg(null);
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setAvatarMsg({ ok: false, text: t('app.profile.avatar.errorType') });
            return;
        }
        if (file.size > 2_000_000) {
            setAvatarMsg({ ok: false, text: t('app.profile.avatar.errorSize') });
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setAvatarPreview(dataUrl);
            setAvatarMsg(null);
        };
        reader.readAsDataURL(file);
    }, [t]);

    const handleAvatarSave = async () => {
        if (!avatarPreview || avatarPreview === user?.avatarUrl) return;
        setAvatarLoading(true);
        setAvatarMsg(null);
        try {
            await updateAvatar(avatarPreview);
            setAvatarMsg({ ok: true, text: t('app.profile.avatar.saved') });
        } catch (err) {
            setAvatarMsg({ ok: false, text: err instanceof Error ? err.message : t('app.profile.avatar.saved') });
        } finally {
            setAvatarLoading(false);
        }
    };

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return (
        <div
            className="profile-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={t('app.profile.title')}
            onClick={onClose}
        >
            <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
                <div className="profile-header">
                    <h2 className="profile-title">
                        {user?.avatarUrl
                            ? <img src={user.avatarUrl} alt="Avatar" className="profile-title-avatar" />
                            : <span className="profile-title-avatar-placeholder">👤</span>
                        }
                        {t('app.profile.title')}
                    </h2>
                    <button className="profile-close" onClick={onClose} aria-label={t('app.profile.title')}>✕</button>
                </div>

                {/* Read-only email */}
                <div className="profile-section">
                    <label className="profile-label">{t('app.profile.email.label')}</label>
                    <input className="auth-input" type="email" value={user?.email ?? ''} disabled />
                </div>

                <hr className="profile-divider" />

                {/* Avatar */}
                <div className="profile-section">
                    <label className="profile-label">{t('app.profile.avatar.label')}</label>
                    <div className="profile-avatar-row">
                        <div className="profile-avatar-preview">
                            {avatarPreview
                                ? <img src={avatarPreview} alt="Avatar" className="profile-avatar-img" />
                                : <span className="profile-avatar-placeholder">👤</span>
                            }
                        </div>
                        <div className="profile-avatar-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                📁 {t('app.profile.avatar.upload')}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            {avatarPreview && avatarPreview !== user?.avatarUrl && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleAvatarSave}
                                    disabled={avatarLoading}
                                >
                                    {avatarLoading ? t('app.profile.avatar.saving') : t('app.profile.avatar.save')}
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Preset avatar grid */}
                    <div className="avatar-presets">
                        {PRESET_AVATARS.map((emoji) => {
                            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text y="50" x="8" font-size="48">${emoji}</text></svg>`;
                            const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
                            return (
                                <button
                                    key={emoji}
                                    type="button"
                                    className={`avatar-preset-btn${avatarPreview === dataUrl ? ' selected' : ''}`}
                                    onClick={() => handlePresetSelect(emoji)}
                                    title={emoji}
                                    aria-label={`Usar avatar ${emoji}`}
                                >
                                    {emoji}
                                </button>
                            );
                        })}
                    </div>
                    <p className="avatar-presets-hint">{t('app.profile.avatar.hint')}</p>
                    {avatarMsg && (
                        <p className={avatarMsg.ok ? 'profile-msg-ok' : 'auth-error'}>{avatarMsg.text}</p>
                    )}
                </div>

                <hr className="profile-divider" />

                {/* Change name */}
                <form className="profile-section" onSubmit={handleNameSubmit}>
                    <label className="profile-label">{t('app.profile.name.label')}</label>
                    <input
                        className="auth-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={1}
                    />
                    {nameMsg && (
                        <p className={nameMsg.ok ? 'profile-msg-ok' : 'auth-error'}>{nameMsg.text}</p>
                    )}
                    <button type="submit" className="btn-primary" disabled={nameLoading || name === user?.name}>
                        {nameLoading ? t('app.profile.name.saving') : t('app.profile.name.save')}
                    </button>
                </form>

                <hr className="profile-divider" />

                {/* Change password */}
                <form className="profile-section" onSubmit={handlePasswordSubmit}>
                    <label className="profile-label">{t('app.profile.password.label')}</label>

                    <div className="auth-pass-wrap">
                        <input
                            className="auth-input auth-pass-input"
                            type={showCurrent ? 'text' : 'password'}
                            placeholder={t('app.profile.password.current')}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                        <button type="button" className="auth-eye" onClick={() => setShowCurrent(v => !v)}
                            aria-label={showCurrent ? t('app.auth.login.hidePassword') : t('app.auth.login.showPassword')}>
                            {showCurrent ? '🙈' : '👁️'}
                        </button>
                    </div>

                    <div className="auth-pass-wrap" style={{ marginTop: '0.5rem' }}>
                        <input
                            className="auth-input auth-pass-input"
                            type={showNew ? 'text' : 'password'}
                            placeholder={t('app.profile.password.new')}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <button type="button" className="auth-eye" onClick={() => setShowNew(v => !v)}
                            aria-label={showNew ? t('app.auth.login.hidePassword') : t('app.auth.login.showPassword')}>
                            {showNew ? '🙈' : '👁️'}
                        </button>
                    </div>

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
            </div>
        </div>
    );
}
