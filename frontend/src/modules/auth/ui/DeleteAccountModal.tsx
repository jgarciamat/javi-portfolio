import { useState } from 'react';
import type { DeleteAccountProof } from '@core/api/authApi';
import { GOOGLE_CLIENT_ID } from '@core/config/api.config';
import { useI18n } from '@core/i18n/I18nContext';
import { Modal } from '@shared/components/Modal';
import '@shared/components/css/ConfirmDeleteModal.css';
import './css/DeleteAccountModal.css';
import { Icon } from '@shared/components/Icon';
import { PLAY_SUBSCRIPTIONS_URL } from '../application/useDeleteAccount';
import { AuthPasswordInput } from './AuthPasswordInput';
import { GoogleButton } from './GoogleButton';

interface DeleteAccountModalProps {
  loading: boolean;
  error: string | null;
  /** Password accounts confirm with it; Google-only ones with a recent Google sign-in. */
  hasPassword: boolean;
  /** A Google Play subscription that would keep charging: the user must cancel it there. */
  playActive: boolean;
  onConfirm: (proof: DeleteAccountProof) => void;
  onCancel: () => void;
}

export function DeleteAccountModal({
  loading,
  error,
  hasPassword,
  playActive,
  onConfirm,
  onCancel,
}: DeleteAccountModalProps) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [playCancelled, setPlayCancelled] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const play = playActive ? { confirmPlayCancelled: true } : {};
  const ready = (!hasPassword || password.length > 0) && (!playActive || playCancelled);

  return (
    <Modal
      label={t('app.profile.deleteAccount.modal.title')}
      onClose={onCancel}
      dismissible={!loading}
      overlayClassName="confirm-delete-overlay"
      className="confirm-delete-modal"
    >
      <div className="confirm-delete-icon" aria-hidden="true">
        <Icon name="trash" />
      </div>
      <h2 className="confirm-delete-title">{t('app.profile.deleteAccount.modal.title')}</h2>
      <p className="confirm-delete-message confirm-delete-warning">
        {t('app.profile.deleteAccount.modal.warning')}
      </p>
      <p className="confirm-delete-message">{t('app.profile.deleteAccount.modal.body')}</p>

      {playActive && (
        <div className="delete-account-play" role="alert">
          <p>{t('app.profile.deleteAccount.play.warning')}</p>
          <a href={PLAY_SUBSCRIPTIONS_URL} target="_blank" rel="noopener noreferrer">
            {t('app.profile.deleteAccount.play.link')}
          </a>
          <label className="delete-account-check">
            <input
              type="checkbox"
              checked={playCancelled}
              onChange={(e) => setPlayCancelled(e.target.checked)}
            />
            {t('app.profile.deleteAccount.play.confirm')}
          </label>
        </div>
      )}

      {hasPassword ? (
        <div className="delete-account-field">
          <AuthPasswordInput
            value={password}
            onChange={setPassword}
            placeholder={t('app.profile.deleteAccount.password')}
            autoComplete="current-password"
          />
        </div>
      ) : (
        <div className="delete-account-field">
          <p className="confirm-delete-message">{t('app.profile.deleteAccount.google')}</p>
          {GOOGLE_CLIENT_ID && (!playActive || playCancelled) && (
            <GoogleButton
              label={t('app.profile.deleteAccount.googleConfirm')}
              onToken={(googleToken) => {
                setGoogleFailed(false);
                onConfirm({ googleToken, ...play });
              }}
              onError={() => setGoogleFailed(true)}
            />
          )}
        </div>
      )}

      {(error || googleFailed) && (
        <p className="confirm-delete-message confirm-delete-error" role="alert">
          {googleFailed ? t('app.auth.error.google') : error}
        </p>
      )}
      <div className="confirm-delete-actions">
        <button className="btn-cancel" onClick={onCancel} disabled={loading}>
          {t('app.profile.deleteAccount.modal.cancel')}
        </button>
        <button
          className="btn-delete"
          onClick={() => onConfirm(hasPassword ? { password, ...play } : play)}
          disabled={loading || !ready}
          aria-busy={loading}
        >
          {loading
            ? t('app.profile.deleteAccount.deleting')
            : t('app.profile.deleteAccount.modal.confirm')}
        </button>
      </div>
    </Modal>
  );
}
