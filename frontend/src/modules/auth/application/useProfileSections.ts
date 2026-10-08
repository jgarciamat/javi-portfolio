import { useEffect, useState } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { useI18n } from '@core/i18n/I18nContext';
import { errorMessage } from '@shared/utils/errors';
import { validatePassword } from '@modules/auth/domain/passwordValidation';
import { AVATAR_MAX_BYTES, emojiAvatar } from '@modules/auth/domain/avatar';

export interface StatusMsg {
  ok: boolean;
  text: string;
}

/** Runs a save and turns the outcome into a success / error message. */
function useStatus(okKey: string, errorKey: string) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<StatusMsg | null>(null);
  const run = async (save: () => Promise<void>): Promise<boolean> => {
    setLoading(true);
    setMessage(null);
    try {
      await save();
      setMessage({ ok: true, text: t(okKey) });
      return true;
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err, t(errorKey)) });
      return false;
    } finally {
      setLoading(false);
    }
  };
  return { loading, message, setMessage, run };
}

export function useNameSection() {
  const { user, updateName } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const status = useStatus('app.profile.name.saved', 'app.profile.name.error');

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await status.run(() => updateName(name.trim()));
  };

  return {
    name,
    setName,
    unchanged: name.trim() === (user?.name ?? '') || !name.trim(),
    loading: status.loading,
    message: status.message,
    handleNameSubmit,
  };
}

export function usePasswordSection() {
  const { updatePassword, user } = useAuth();
  const { t } = useI18n();
  /** Accounts created with Google have no password yet: they can set one directly. */
  const hasPassword = user?.hasPassword !== false;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const status = useStatus('app.profile.password.saved', 'app.profile.password.error');
  const mismatch = confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      status.setMessage({ ok: false, text: validation.errors.map((key) => t(key)).join(' · ') });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      status.setMessage({ ok: false, text: t('app.profile.password.mismatch') });
      return;
    }
    const saved = await status.run(() =>
      updatePassword(hasPassword ? currentPassword : undefined, newPassword)
    );
    if (saved) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  return {
    hasPassword,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    mismatch,
    loading: status.loading,
    message: status.message,
    handlePasswordSubmit,
  };
}

/** Reads a picture as a data URL. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function useAvatarSection() {
  const { user, updateAvatar } = useAuth();
  const { t } = useI18n();
  const saved = user?.avatarUrl ?? null;
  const [preview, setPreview] = useState<string | null>(saved);
  const status = useStatus('app.profile.avatar.saved', 'app.profile.avatar.error');

  useEffect(() => setPreview(saved), [saved]);

  const pickPreset = (emoji: string) => {
    setPreview(emojiAvatar(emoji));
    status.setMessage(null);
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      status.setMessage({ ok: false, text: t('app.profile.avatar.errorType') });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      status.setMessage({ ok: false, text: t('app.profile.avatar.errorSize') });
      return;
    }
    try {
      setPreview(await readAsDataUrl(file));
      status.setMessage(null);
    } catch {
      status.setMessage({ ok: false, text: t('app.profile.avatar.errorType') });
    }
  };

  const save = async () => {
    if (preview && preview !== saved) await status.run(() => updateAvatar(preview));
  };

  return {
    preview,
    dirty: !!preview && preview !== saved,
    loading: status.loading,
    message: status.message,
    pickPreset,
    pickFile,
    save,
  };
}
