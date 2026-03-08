import { useEffect } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import './css/ConfirmDeleteModal.css';

interface ConfirmDeleteModalProps {
    /** Called when the user confirms deletion */
    onConfirm: () => void;
    /** Called when the user cancels */
    onCancel: () => void;
}

/**
 * A focused confirmation dialog shown before deleting a transaction.
 * Closes on Escape key or overlay click.
 */
export function ConfirmDeleteModal({ onConfirm, onCancel }: ConfirmDeleteModalProps) {
    const { t } = useI18n();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onCancel();
    };

    return (
        <div
            className="confirm-delete-overlay"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-label={t('app.confirm.delete.title')}
        >
            <div className="confirm-delete-modal">
                <div className="confirm-delete-icon">🗑️</div>
                <h2 className="confirm-delete-title">{t('app.confirm.delete.title')}</h2>
                <p className="confirm-delete-message">{t('app.confirm.delete.message')}</p>
                <div className="confirm-delete-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={onCancel}
                        autoFocus
                    >
                        {t('app.confirm.delete.cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn-danger"
                        onClick={onConfirm}
                    >
                        {t('app.confirm.delete.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
