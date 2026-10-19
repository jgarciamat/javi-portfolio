import { useState } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { useI18n } from '@core/i18n/I18nContext';
import { ApiError } from '@core/api/http';
import { errorMessage } from '@shared/utils/errors';
import { validatePassword } from '@modules/auth/domain/passwordValidation';
import { avatarChoices } from '@modules/auth/domain/avatar';

export interface StatusMsg {
  ok: boolean;
  text: string;
}

/**
 * Runs a save and turns the outcome into a success / error message. `handled` lets the
 * caller show an error elsewhere (e.g. on the field): it returns true to skip the message.
 */
function useStatus(okKey: string, errorKey: string) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<StatusMsg | null>(null);
  const run = async (
    save: () => Promise<void>,
    handled: (err: unknown) => boolean = () => false
  ): Promise<boolean> => {
    setLoading(true);
    setMessage(null);
    try {
      await save();
      setMessage({ ok: true, text: t(okKey) });
      return true;
    } catch (err) {
      if (!handled(err)) setMessage({ ok: false, text: errorMessage(err, t(errorKey)) });
      return false;
    } finally {
      setLoading(false);
    }
  };
  return { loading, message, setMessage, run };
}

/** The name, edited in place: `onSaved` runs once the new one is stored. */
export function useNameSection(onSaved: () => void) {
  const { user, updateName } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const status = useStatus('app.profile.name.saved', 'app.profile.name.error');

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await status.run(() => updateName(name.trim()))) onSaved();
  };

  return {
    name,
    setName,
    /** Starts editing again from the saved name, with no message left. */
    reset: () => {
      setName(user?.name ?? '');
      status.setMessage(null);
    },
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
  /** The API rejected the current password (403, the session stays open). */
  const [wrongCurrent, setWrongCurrent] = useState(false);
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
    setWrongCurrent(false);
    const saved = await status.run(
      () => updatePassword(hasPassword ? currentPassword : undefined, newPassword),
      (err) => {
        const wrong = err instanceof ApiError && err.code === 'WRONG_PASSWORD';
        setWrongCurrent(wrong);
        return wrong;
      }
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
    setCurrentPassword: (value: string) => {
      setCurrentPassword(value);
      setWrongCurrent(false);
    },
    wrongCurrent,
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

/** The emoji avatar: picking one saves it at once. */
export function useAvatarSection() {
  const { user, updateAvatar } = useAuth();
  const saved = user?.avatar ?? null;
  /** The one being saved: shown as selected until the API answers. */
  const [pending, setPending] = useState<string | null>(null);
  const status = useStatus('app.profile.avatar.saved', 'app.profile.avatar.error');

  const choose = async (emoji: string) => {
    if (emoji === saved || pending) return;
    setPending(emoji);
    await status.run(() => updateAvatar(emoji));
    setPending(null);
  };

  return {
    choices: avatarChoices(saved),
    selected: pending ?? saved,
    loading: status.loading,
    message: status.message,
    choose,
  };
}
