import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Modal } from '@shared/components/Modal';
import '../css/DeleteRuleModal.css';

export type DeleteScope = 'none' | 'from_current' | 'all';

const SCOPES = [
  { value: 'from_current', icon: '✂️' },
  { value: 'all', icon: '🗑️' },
] as const;

interface DeleteRuleModalProps {
  ruleName: string;
  onConfirm: (scope: DeleteScope) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

/** Deleting a rule asks what to do with the movements it already generated. */
export function DeleteRuleModal({
  ruleName,
  onConfirm,
  onCancel,
  loading,
  error,
}: DeleteRuleModalProps) {
  const { t } = useI18n();
  const [scope, setScope] = useState<DeleteScope>('from_current');

  return (
    <Modal
      label={t('app.recurring.delete.modal.title')}
      onClose={onCancel}
      dismissible={!loading}
      overlayClassName="delete-rule-overlay"
      className="delete-rule-modal"
    >
      <h3 className="delete-rule-title">{t('app.recurring.delete.modal.title')}</h3>
      <p className="delete-rule-subtitle">
        <strong>{ruleName}</strong> — {t('app.recurring.delete.modal.subtitle')}
      </p>
      <div className="delete-rule-options" role="radiogroup">
        {SCOPES.map(({ value, icon }) => (
          <label
            key={value}
            className={`delete-rule-option${
              scope === value ? ' delete-rule-option--selected' : ''
            }`}
          >
            <input
              type="radio"
              name="delete-scope"
              value={value}
              checked={scope === value}
              onChange={() => setScope(value)}
            />
            <span className="delete-rule-option-icon" aria-hidden="true">
              {icon}
            </span>
            <span className="delete-rule-option-text">
              {t(`app.recurring.delete.scope.${value}`)}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="recurring-error">{error}</p>}
      <div className="delete-rule-actions">
        <button className="btn-danger" onClick={() => onConfirm(scope)} disabled={loading}>
          {t('app.recurring.delete.confirm')}
        </button>
        <button className="btn-cancel" onClick={onCancel} disabled={loading}>
          {t('app.recurring.delete.cancel')}
        </button>
      </div>
    </Modal>
  );
}
