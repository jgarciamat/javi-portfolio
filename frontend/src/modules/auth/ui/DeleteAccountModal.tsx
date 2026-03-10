import { useEffect } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import '@shared/components/css/ConfirmDeleteModal.css';

interface DeleteAccountModalProps {
    loading: boolean;
    error: string | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteAccountModal({ loading, error, onConfirm, onCancel }: DeleteAccountModalProps) {
    const { t } = useI18n();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onCancel(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel, loading]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !loading) onCancel();
    };

    return (
        <div
            className="confirm-delete-overlay"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-label={t('app.profile.deleteAccount.modal.title')}
        >
            <div className="confirm-delete-modal">
                <div className="confirm-delete-icon">🗑️</div>
                <h2 className="confirm-delete-title">{t('app.profile.deleteAccount.modal.title')}</h2>
                <p className="confirm-delete-message" style={{ color: '#f87171', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {t('app.profile.deleteAccount.modal.warning')}
                </p>
                <p className="confirm-delete-message">
                    {t('app.profile.deleteAccount.modal.body')}
                </p>
                {error && (
                    <p className="confirm-delete-message" style={{ color: '#f87171' }}>
                        {error}
                    </p>
                )}
                <div className="confirm-delete-actions">
                    <button
                        className="btn-cancel"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {t('app.profile.deleteAccount.modal.cancel')}
                    </button>
                    <button
                        className="btn-delete"
                        onClick={onConfirm}
                        disabled={loading}
                        aria-busy={loading}
                    >
                        {loading
                            ? t('app.profile.deleteAccount.deleting')
                            : t('app.profile.deleteAccount.modal.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
