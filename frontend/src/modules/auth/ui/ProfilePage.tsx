import { useEffect, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useAuth } from '@shared/hooks/useAuth';
import { useNameSection, usePasswordSection, useAvatarSection } from '../application/useProfileSections';
import { AvatarSection } from './ProfileAvatarSection';
import { NameSection } from './ProfileNameSection';
import { PasswordSection } from './ProfilePasswordSection';
import { DeleteAccountModal } from './DeleteAccountModal';
import { useDeleteAccount } from '../application/useDeleteAccount';

interface Props {
    onClose: () => void;
}

export function ProfilePage({ onClose }: Props) {
    const { user } = useAuth();
    const { t } = useI18n();
    const nameSection = useNameSection();
    const passwordSection = usePasswordSection();
    const avatarSection = useAvatarSection();
    const { loading: deleteLoading, error: deleteError, handleDelete } = useDeleteAccount();
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !showDeleteModal) onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose, showDeleteModal]);

    return (
        <div
            className="profile-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={t('app.profile.title')}
            onClick={onClose}
        >
            <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
                <div className="profile-header">
                    <h2 className="profile-title">
                        {user?.avatarUrl
                            ? <img src={user.avatarUrl} alt="Avatar" className="profile-title-avatar" />
                            : <span className="profile-title-avatar-placeholder">👤</span>
                        }
                        {t('app.profile.title')}
                    </h2>
                    <button className="profile-close" onClick={onClose} aria-label={t('app.profile.title')}>✕</button>
                </div>

                <div className="profile-section">
                    <label className="profile-label">{t('app.profile.email.label')}</label>
                    <input className="auth-input" type="email" value={user?.email ?? ''} disabled />
                </div>

                <hr className="profile-divider" />
                <AvatarSection {...avatarSection} />

                <hr className="profile-divider" />
                <NameSection {...nameSection} />

                <hr className="profile-divider" />
                <PasswordSection {...passwordSection} />

                <hr className="profile-divider" />
                <div className="profile-section profile-delete-section">
                    <button
                        className="btn-delete-account"
                        onClick={() => setShowDeleteModal(true)}
                        aria-label={t('app.profile.deleteAccount.button')}
                    >
                        🗑️ {t('app.profile.deleteAccount.button')}
                    </button>
                </div>
            </div>

            {showDeleteModal && (
                <DeleteAccountModal
                    loading={deleteLoading}
                    error={deleteError}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteModal(false)}
                />
            )}
        </div>
    );
}