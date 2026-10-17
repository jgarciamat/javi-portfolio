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
import { GoogleConfirmButton } from './GoogleButton';

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

/** The Play subscription must be cancelled there first: link and confirmation. */
function PlaySubscriptionNotice({
  cancelled,
  onCancelled,
}: {
  cancelled: boolean;
  onCancelled: (cancelled: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="delete-account-play" role="alert">
      <p>{t('app.profile.deleteAccount.play.warning')}</p>
      <a href={PLAY_SUBSCRIPTIONS_URL} target="_blank" rel="noopener noreferrer">
        {t('app.profile.deleteAccount.play.link')}
      </a>
      <label className="delete-account-check">
        <input
          type="checkbox"
          checked={cancelled}
          onChange={(e) => onCancelled(e.target.checked)}
        />
        {t('app.profile.deleteAccount.play.confirm')}
      </label>
    </div>
  );
}

/** Google-only accounts confirm with a fresh Google sign-in. */
function GoogleProofField({
  canConfirm,
  onToken,
  onError,
}: {
  canConfirm: boolean;
  onToken: (googleToken: string) => void;
  onError: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="delete-account-field">
      <p className="confirm-delete-message">{t('app.profile.deleteAccount.google')}</p>
      {GOOGLE_CLIENT_ID && canConfirm && (
        <GoogleConfirmButton
          label={t('app.profile.deleteAccount.googleConfirm')}
          onToken={onToken}
          onError={onError}
        />
      )}
    </div>
  );
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
  const playReady = !playActive || playCancelled;
  const ready = (!hasPassword || password.length > 0) && playReady;
  const errorText = googleFailed ? t('app.auth.error.google') : error;

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
        <PlaySubscriptionNotice cancelled={playCancelled} onCancelled={setPlayCancelled} />
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
        <GoogleProofField
          canConfirm={playReady}
          onToken={(googleToken) => {
            setGoogleFailed(false);
            onConfirm({ googleToken, ...play });
          }}
          onError={() => setGoogleFailed(true)}
        />
      )}

      {errorText && (
        <p className="confirm-delete-message confirm-delete-error" role="alert">
          {errorText}
        </p>
      )}
      <DeleteAccountActions
        loading={loading}
        ready={ready}
        onCancel={onCancel}
        onConfirm={() => onConfirm(hasPassword ? { password, ...play } : play)}
      />
    </Modal>
  );
}

/** Cancel, and delete once the proof is ready. */
function DeleteAccountActions({
  loading,
  ready,
  onCancel,
  onConfirm,
}: {
  loading: boolean;
  ready: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="confirm-delete-actions">
      <button className="btn-cancel" onClick={onCancel} disabled={loading}>
        {t('app.profile.deleteAccount.modal.cancel')}
      </button>
      <button
        className="btn-delete"
        onClick={onConfirm}
        disabled={loading || !ready}
        aria-busy={loading}
      >
        {loading
          ? t('app.profile.deleteAccount.deleting')
          : t('app.profile.deleteAccount.modal.confirm')}
      </button>
    </div>
  );
}
