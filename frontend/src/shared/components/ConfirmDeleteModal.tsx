import { useI18n } from '@core/i18n/I18nContext';
import { Modal } from './Modal';
import './css/ConfirmDeleteModal.css';

interface ConfirmDeleteModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation shown before deleting a movement. */
export function ConfirmDeleteModal({ onConfirm, onCancel }: ConfirmDeleteModalProps) {
  const { t } = useI18n();
  return (
    <Modal
      label={t('app.confirm.delete.title')}
      onClose={onCancel}
      overlayClassName="confirm-delete-overlay"
      className="confirm-delete-modal"
    >
      <div className="confirm-delete-icon" aria-hidden="true">
        🗑️
      </div>
      <h2 className="confirm-delete-title">{t('app.confirm.delete.title')}</h2>
      <p className="confirm-delete-message">{t('app.confirm.delete.message')}</p>
      <div className="confirm-delete-actions">
        <button type="button" className="btn-cancel" onClick={onCancel} autoFocus>
          {t('app.confirm.delete.cancel')}
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm}>
          {t('app.confirm.delete.confirm')}
        </button>
      </div>
    </Modal>
  );
}
