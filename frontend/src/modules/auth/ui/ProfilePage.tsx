import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { validatePassword } from '@modules/auth/domain/passwordValidation';

interface Props {
    onClose: () => void;
}

export function ProfilePage({ onClose }: Props) {
    const { user, updateName, updatePassword, updateAvatar } = useAuth();

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
            setNameMsg({ ok: true, text: 'Nombre actualizado correctamente' });
        } catch (err) {
            setNameMsg({ ok: false, text: err instanceof Error ? err.message : 'Error al actualizar nombre' });
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
            setPassMsg({ ok: false, text: 'Las contraseñas nuevas no coinciden' });
            return;
        }
        setPassLoading(true);
        try {
            await updatePassword(currentPassword, newPassword);
            setPassMsg({ ok: true, text: 'Contraseña cambiada correctamente' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            setPassMsg({ ok: false, text: err instanceof Error ? err.message : 'Error al cambiar contraseña' });
        } finally {
            setPassLoading(false);
        }
    };

    // ── Avatar ────────────────────────────────────────────────────────────────
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setAvatarMsg({ ok: false, text: 'El archivo debe ser una imagen' });
            return;
        }
        if (file.size > 600_000) {
            setAvatarMsg({ ok: false, text: 'La imagen no puede superar 600 KB' });
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setAvatarPreview(dataUrl);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleAvatarSave = async () => {
        if (!avatarPreview || avatarPreview === user?.avatarUrl) return;
        setAvatarLoading(true);
        setAvatarMsg(null);
        try {
            await updateAvatar(avatarPreview);
            setAvatarMsg({ ok: true, text: 'Foto de perfil actualizada' });
        } catch (err) {
            setAvatarMsg({ ok: false, text: err instanceof Error ? err.message : 'Error al guardar foto' });
        } finally {
            setAvatarLoading(false);
        }
    };

    return (
        <div className="profile-overlay" role="dialog" aria-modal="true" aria-label="Perfil de usuario">
            <div className="profile-panel">
                <div className="profile-header">
                    <h2 className="profile-title">👤 Mi perfil</h2>
                    <button className="profile-close" onClick={onClose} aria-label="Cerrar perfil">✕</button>
                </div>

                {/* Read-only email */}
                <div className="profile-section">
                    <label className="profile-label">Email (no modificable)</label>
                    <input className="auth-input" type="email" value={user?.email ?? ''} disabled />
                </div>

                <hr className="profile-divider" />

                {/* Avatar */}
                <div className="profile-section">
                    <label className="profile-label">Foto de perfil</label>
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
                                Elegir imagen
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
                                    {avatarLoading ? 'Guardando...' : 'Guardar foto'}
                                </button>
                            )}
                        </div>
                    </div>
                    {avatarMsg && (
                        <p className={avatarMsg.ok ? 'profile-msg-ok' : 'auth-error'}>{avatarMsg.text}</p>
                    )}
                </div>

                <hr className="profile-divider" />

                {/* Change name */}
                <form className="profile-section" onSubmit={handleNameSubmit}>
                    <label className="profile-label">Nombre</label>
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
                        {nameLoading ? 'Guardando...' : 'Cambiar nombre'}
                    </button>
                </form>

                <hr className="profile-divider" />

                {/* Change password */}
                <form className="profile-section" onSubmit={handlePasswordSubmit}>
                    <label className="profile-label">Cambiar contraseña</label>

                    <div className="auth-pass-wrap">
                        <input
                            className="auth-input auth-pass-input"
                            type={showCurrent ? 'text' : 'password'}
                            placeholder="Contraseña actual"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                        <button type="button" className="auth-eye" onClick={() => setShowCurrent(v => !v)}
                            aria-label={showCurrent ? 'Ocultar' : 'Mostrar'}>
                            {showCurrent ? '🙈' : '👁️'}
                        </button>
                    </div>

                    <div className="auth-pass-wrap" style={{ marginTop: '0.5rem' }}>
                        <input
                            className="auth-input auth-pass-input"
                            type={showNew ? 'text' : 'password'}
                            placeholder="Nueva contraseña"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <button type="button" className="auth-eye" onClick={() => setShowNew(v => !v)}
                            aria-label={showNew ? 'Ocultar' : 'Mostrar'}>
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
                        placeholder="Repetir nueva contraseña"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                        style={{ marginTop: '0.5rem' }}
                    />
                    {confirmNewPassword.length > 0 && !newPassMatch && (
                        <p className="auth-hint-error">✗ Las contraseñas no coinciden</p>
                    )}

                    {passMsg && (
                        <p className={passMsg.ok ? 'profile-msg-ok' : 'auth-error'}>{passMsg.text}</p>
                    )}

                    <button type="submit" className="btn-primary" disabled={passLoading}>
                        {passLoading ? 'Cambiando...' : 'Cambiar contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
}
