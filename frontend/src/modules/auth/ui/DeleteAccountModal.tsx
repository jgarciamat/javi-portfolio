import { useI18n } from '@core/i18n/I18nContext';
import { Modal } from '@shared/components/Modal';
import '@shared/components/css/ConfirmDeleteModal.css';

interface DeleteAccountModalProps {
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAccountModal({
  loading,
  error,
  onConfirm,
  onCancel,
}: DeleteAccountModalProps) {
  const { t } = useI18n();
  return (
    <Modal
      label={t('app.profile.deleteAccount.modal.title')}
      onClose={onCancel}
      dismissible={!loading}
      overlayClassName="confirm-delete-overlay"
      className="confirm-delete-modal"
    >
      <div className="confirm-delete-icon" aria-hidden="true">
        🗑️
      </div>
      <h2 className="confirm-delete-title">{t('app.profile.deleteAccount.modal.title')}</h2>
      <p className="confirm-delete-message confirm-delete-warning">
        {t('app.profile.deleteAccount.modal.warning')}
      </p>
      <p className="confirm-delete-message">{t('app.profile.deleteAccount.modal.body')}</p>
      {error && (
        <p className="confirm-delete-message confirm-delete-error" role="alert">
          {error}
        </p>
      )}
      <div className="confirm-delete-actions">
        <button className="btn-cancel" onClick={onCancel} disabled={loading}>
          {t('app.profile.deleteAccount.modal.cancel')}
        </button>
        <button className="btn-delete" onClick={onConfirm} disabled={loading} aria-busy={loading}>
          {loading
            ? t('app.profile.deleteAccount.deleting')
            : t('app.profile.deleteAccount.modal.confirm')}
        </button>
      </div>
    </Modal>
  );
}
