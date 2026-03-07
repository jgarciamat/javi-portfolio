import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { validatePassword } from '@modules/auth/domain/passwordValidation';
import { useI18n } from '@core/i18n/I18nContext';

export interface StatusMsg { ok: boolean; text: string; }

export function useNameSection() {
    const { user, updateName } = useAuth();
    const { t } = useI18n();
    const [name, setName] = useState(user?.name ?? '');
    const [nameLoading, setNameLoading] = useState(false);
    const [nameMsg, setNameMsg] = useState<StatusMsg | null>(null);

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

    return { user, name, setName, nameLoading, nameMsg, handleNameSubmit };
}

export function usePasswordSection() {
    const { updatePassword } = useAuth();
    const { t } = useI18n();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [passMsg, setPassMsg] = useState<StatusMsg | null>(null);

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

    return {
        currentPassword, setCurrentPassword,
        newPassword, setNewPassword,
        confirmNewPassword, setConfirmNewPassword,
        showCurrent, setShowCurrent,
        showNew, setShowNew,
        passLoading, passMsg,
        newPassValidation, newPassMatch,
        handlePasswordSubmit,
    };
}

export function useAvatarSection() {
    const { user, updateAvatar } = useAuth();
    const { t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [avatarMsg, setAvatarMsg] = useState<StatusMsg | null>(null);

    useEffect(() => {
        setAvatarPreview(user?.avatarUrl ?? null);
    }, [user?.avatarUrl]);

    const handlePresetSelect = useCallback((emoji: string) => {
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

    return {
        user, fileInputRef, avatarPreview, avatarLoading, avatarMsg,
        handlePresetSelect, handleFileChange, handleAvatarSave,
    };
}
