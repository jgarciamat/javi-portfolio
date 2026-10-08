import { useState, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useAuth } from '@shared/hooks/useAuth';
import { Modal } from '@shared/components/Modal';
import { useDeleteAccount } from '../application/useDeleteAccount';
import { AvatarSection } from './ProfileAvatarSection';
import { DeleteAccountModal } from './DeleteAccountModal';
import { NameSection } from './ProfileNameSection';
import { PasswordSection } from './ProfilePasswordSection';

type SectionId = 'avatar' | 'name' | 'password' | 'settings';

function AccordionSection({
  id,
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  icon: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
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
        <span className="profile-accordion-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="profile-accordion-title">{title}</span>
        <span className={`profile-accordion-chevron${open ? ' open' : ''}`} aria-hidden="true">
          ›
        </span>
      </button>
      <div id={`profile-acc-${id}`} className={`profile-accordion-body${open ? ' open' : ''}`}>
        {/* Closed sections are not mounted: their forms start clean when reopened. */}
        {open && <div className="profile-accordion-inner">{children}</div>}
      </div>
    </div>
  );
}

const SECTIONS: { id: SectionId; icon: string; titleKey: string; Content: () => ReactNode }[] = [
  { id: 'avatar', icon: '🖼️', titleKey: 'app.profile.avatar.label', Content: AvatarSection },
  { id: 'name', icon: '✏️', titleKey: 'app.profile.name.label', Content: NameSection },
  { id: 'password', icon: '🔒', titleKey: 'app.profile.password.label', Content: PasswordSection },
];

export function ProfilePage({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const deletion = useDeleteAccount();
  const [showDelete, setShowDelete] = useState(false);
  const [openSection, setOpenSection] = useState<SectionId | null>('avatar');
  const toggle = (id: SectionId) => setOpenSection((prev) => (prev === id ? null : id));

  return (
    <Modal
      label={t('app.profile.title')}
      onClose={onClose}
      overlayClassName="profile-overlay"
      className="profile-panel"
    >
      <div className="profile-header">
        <h2 className="profile-title">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="profile-title-avatar" />
          ) : (
            <span className="profile-title-avatar-placeholder" aria-hidden="true">
              👤
            </span>
          )}
          {t('app.profile.title')}
        </h2>
        <button className="profile-close" onClick={onClose} aria-label={t('app.common.close')}>
          ✕
        </button>
      </div>

      <div className="profile-section profile-email-section">
        <label className="profile-label" htmlFor="profile-email">
          {t('app.profile.email.label')}
        </label>
        <input
          id="profile-email"
          className="auth-input"
          type="email"
          value={user?.email ?? ''}
          disabled
        />
      </div>

      {SECTIONS.map(({ id, icon, titleKey, Content }) => (
        <div key={id}>
          <hr className="profile-divider" />
          <AccordionSection
            id={id}
            title={t(titleKey)}
            icon={icon}
            open={openSection === id}
            onToggle={() => toggle(id)}
          >
            <Content />
          </AccordionSection>
        </div>
      ))}

      <hr className="profile-divider" />
      <AccordionSection
        id="settings"
        title={t('app.profile.settings.title')}
        icon="⚙️"
        open={openSection === 'settings'}
        onToggle={() => toggle('settings')}
      >
        <div className="profile-section profile-delete-section">
          <button className="btn-delete-account" onClick={() => setShowDelete(true)}>
            🗑️ {t('app.profile.deleteAccount.button')}
          </button>
        </div>
      </AccordionSection>

      {showDelete && (
        <DeleteAccountModal
          loading={deletion.loading}
          error={deletion.error}
          onConfirm={deletion.handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </Modal>
  );
}
