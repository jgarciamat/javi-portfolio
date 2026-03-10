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

type SectionId = 'avatar' | 'name' | 'password' | 'settings';

function AccordionSection({
    id,
    title,
    icon,
    open,
    onToggle,
    children,
}: {
    id: string;
    title: string;
    icon: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="profile-accordion">
            <button
                className={`profile-accordion-header${open ? ' open' : ''}`}
                onClick={onToggle}
                aria-expanded={open}
                aria-controls={`profile-acc-${id}`}
                type="button"
            >
                <span className="profile-accordion-icon">{icon}</span>
                <span className="profile-accordion-title">{title}</span>
                <span className={`profile-accordion-chevron${open ? ' open' : ''}`}>›</span>
            </button>
            <div
                id={`profile-acc-${id}`}
                className={`profile-accordion-body${open ? ' open' : ''}`}
                role="region"
            >
                <div className="profile-accordion-inner">
                    {children}
                </div>
            </div>
        </div>
    );
}

export function ProfilePage({ onClose }: Props) {
    const { user } = useAuth();
    const { t } = useI18n();
    const nameSection = useNameSection();
    const passwordSection = usePasswordSection();
    const avatarSection = useAvatarSection();
    const { loading: deleteLoading, error: deleteError, handleDelete } = useDeleteAccount();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [openSection, setOpenSection] = useState<SectionId | null>('avatar');

    const toggle = (id: SectionId) =>
        setOpenSection(prev => (prev === id ? null : id));

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

                <div className="profile-section profile-email-section">
                    <label className="profile-label">{t('app.profile.email.label')}</label>
                    <input className="auth-input" type="email" value={user?.email ?? ''} disabled />
                </div>

                <hr className="profile-divider" />

                <AccordionSection
                    id="avatar"
                    title={t('app.profile.avatar.label')}
                    icon="🖼️"
                    open={openSection === 'avatar'}
                    onToggle={() => toggle('avatar')}
                >
                    <AvatarSection {...avatarSection} />
                </AccordionSection>

                <hr className="profile-divider" />

                <AccordionSection
                    id="name"
                    title={t('app.profile.name.label')}
                    icon="✏️"
                    open={openSection === 'name'}
                    onToggle={() => toggle('name')}
                >
                    <NameSection {...nameSection} />
                </AccordionSection>

                <hr className="profile-divider" />

                <AccordionSection
                    id="password"
                    title={t('app.profile.password.label')}
                    icon="🔒"
                    open={openSection === 'password'}
                    onToggle={() => toggle('password')}
                >
                    <PasswordSection {...passwordSection} />
                </AccordionSection>

                <hr className="profile-divider" />

                <AccordionSection
                    id="settings"
                    title={t('app.profile.settings.title')}
                    icon="⚙️"
                    open={openSection === 'settings'}
                    onToggle={() => toggle('settings')}
                >
                    <div className="profile-section profile-delete-section">
                        <button
                            className="btn-delete-account"
                            onClick={() => setShowDeleteModal(true)}
                            aria-label={t('app.profile.deleteAccount.button')}
                        >
                            🗑️ {t('app.profile.deleteAccount.button')}
                        </button>
                    </div>
                </AccordionSection>
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
