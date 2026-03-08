import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import '../css/DeleteRuleModal.css';

export type DeleteScope = 'none' | 'from_current' | 'all';

type VisibleScope = 'from_current' | 'all';

interface DeleteRuleModalProps {
    ruleName: string;
    onConfirm: (scope: DeleteScope) => void;
    onCancel: () => void;
    loading?: boolean;
}

export function DeleteRuleModal({ ruleName, onConfirm, onCancel, loading = false }: DeleteRuleModalProps) {
    const { t } = useI18n();
    const [scope, setScope] = useState<VisibleScope>('from_current');

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onCancel();
    };

    return (
        <div className="delete-rule-overlay" role="dialog" aria-modal="true" onMouseDown={handleOverlayClick}>
            <div className="delete-rule-modal">
                <h3 className="delete-rule-title">{t('app.recurring.delete.modal.title')}</h3>
                <p className="delete-rule-subtitle">
                    <strong>{ruleName}</strong> — {t('app.recurring.delete.modal.subtitle')}
                </p>

                <div className="delete-rule-options">
                    {(['from_current', 'all'] as VisibleScope[]).map((s) => (
                        <label
                            key={s}
                            className={`delete-rule-option${scope === s ? ' delete-rule-option--selected' : ''}`}
                            aria-label={t(`app.recurring.delete.scope.${s}`)}
                        >
                            <input
                                type="radio"
                                name="delete-scope"
                                value={s}
                                checked={scope === s}
                                onChange={() => setScope(s)}
                            />
                            <span className="delete-rule-option-icon">
                                {s === 'from_current' ? '✂️' : '🗑️'}
                            </span>
                            <span className="delete-rule-option-text">
                                {t(`app.recurring.delete.scope.${s}`)}
                            </span>
                        </label>
                    ))}
                </div>

                <div className="delete-rule-actions">
                    <button
                        className="btn-danger"
                        onClick={() => onConfirm(scope)}
                        disabled={loading}
                    >
                        {t('app.recurring.delete.confirm')}
                    </button>
                    <button
                        className="btn-cancel"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {t('app.recurring.delete.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
}
