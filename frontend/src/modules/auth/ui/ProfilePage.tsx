import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { Icon } from '@shared/components/Icon';
import { Modal } from '@shared/components/Modal';
import { useAuth } from '@shared/hooks/useAuth';
import { useDeleteAccount } from '../application/useDeleteAccount';
import { DEFAULT_AVATAR } from '../domain/avatar';
import { AvatarSection } from './ProfileAvatarSection';
import { DeleteAccountModal } from './DeleteAccountModal';
import { NameSection } from './ProfileNameSection';
import { PasswordRow } from './ProfilePasswordSection';
import '@shared/components/css/AuthFields.css';
import './css/Profile.css';

interface ProfilePageProps {
  onClose: () => void;
  /** Goes to the settings section (the panel closes). Unset: no link. */
  onOpenSettings?: () => void;
  /** Goes to the plan section (the panel closes). Unset: no button on the plan row. */
  onOpenPlan?: () => void;
}

/** The plan row: shown once the plan is known. */
function PlanRow({ onOpenPlan }: { onOpenPlan?: () => void }) {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  if (!plan?.overview) return null;
  return (
    <div className="profile-row">
      <span className="profile-row-icon" aria-hidden="true">
        <Icon name="star" />
      </span>
      <div className="profile-row-text">
        <span className="profile-row-label">{t('app.profile.plan.label')}</span>
        <span className="profile-row-value">
          {plan.isPremium ? t('billing.premium') : t('billing.free')}
        </span>
      </div>
      {onOpenPlan && (
        <button type="button" className="profile-btn-ghost" onClick={onOpenPlan}>
          {t('app.profile.plan.open')}
        </button>
      )}
    </div>
  );
}

/** The user's own panel: avatar, account data, settings, signing out and deleting. */
export function ProfilePage({ onClose, onOpenSettings, onOpenPlan }: ProfilePageProps) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const deletion = useDeleteAccount();
  const [showDelete, setShowDelete] = useState(false);

  return (
    <Modal
      label={t('app.profile.title')}
      onClose={onClose}
      overlayClassName="profile-overlay"
      className="profile-panel"
    >
      <div className="profile-topbar">
        <h2 className="profile-title">{t('app.profile.title')}</h2>
        <button
          type="button"
          className="profile-close"
          onClick={onClose}
          aria-label={t('app.common.close')}
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="profile-identity">
        <span className="profile-avatar-lg" aria-hidden="true">
          {user?.avatar ?? DEFAULT_AVATAR}
        </span>
        <p className="profile-identity-name">{user?.name}</p>
        <p className="profile-identity-email">
          <span className="sr-only">{t('app.profile.email.label')}: </span>
          <span className="profile-identity-address">{user?.email}</span>
          <span className="profile-identity-lock" title={t('app.profile.email.locked')}>
            <Icon name="lock" size={12} />
          </span>
          <span className="sr-only"> ({t('app.profile.email.locked')})</span>
        </p>
      </div>

      <AvatarSection />

      <section className="profile-card" aria-labelledby="profile-account-title">
        <h3 id="profile-account-title" className="profile-card-title">
          {t('app.profile.account')}
        </h3>
        <div className="profile-rows">
          <NameSection />
          <PasswordRow />
          <PlanRow onOpenPlan={onOpenPlan} />
        </div>
      </section>

      <div className="profile-footer">
        {onOpenSettings && (
          <button type="button" className="profile-link" onClick={onOpenSettings}>
            <Icon name="settings" size={16} />
            <span>{t('app.profile.settings.title')}</span>
          </button>
        )}
        <button type="button" className="profile-link" onClick={logout}>
          <Icon name="logout" size={16} />
          <span>{t('app.profile.logout')}</span>
        </button>
        <button
          type="button"
          className="profile-link profile-link--danger"
          onClick={() => setShowDelete(true)}
        >
          <Icon name="trash" size={16} />
          <span>{t('app.profile.deleteAccount.button')}</span>
        </button>
      </div>

      {showDelete && (
        <DeleteAccountModal
          loading={deletion.loading}
          error={deletion.error}
          hasPassword={user?.hasPassword !== false}
          playActive={deletion.playActive}
          onConfirm={deletion.handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </Modal>
  );
}
