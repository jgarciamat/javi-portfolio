import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { BrandLogo } from '@shared/components/BrandLogo';
import { Icon } from '@shared/components/Icon';
import { useAuth } from '@shared/hooks/useAuth';
import { useDialog } from '@shared/hooks/useDialog';
import {
  DASHBOARD_SECTIONS,
  GROUP_COLORS,
  offersEnabled,
  SECTION_GROUPS,
  type DashboardTab,
} from '../navigation';
import '../css/Sections.css';

interface BurgerMenuProps {
  open: boolean;
  tab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenProfile: () => void;
  onOpenInvite: () => void;
  onClose: () => void;
}

/**
 * Modal behaviour while the menu is open: focus starts on the close button, Tab stays
 * inside and Escape closes it; on close, focus goes back to the menu button.
 */
function MenuFocus({
  panel,
  closeButton,
  onClose,
}: {
  panel: RefObject<HTMLElement | null>;
  closeButton: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  useDialog(panel, onClose, true);
  useEffect(() => closeButton.current?.focus(), [closeButton]);
  return null;
}

/** Every section by groups, with the profile and «invite a friend»: in the menu and the side bar. */
export function MenuNav({
  tab,
  onSelectTab,
  onOpenProfile,
  onOpenInvite,
  className,
  label,
}: {
  tab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenProfile: () => void;
  onOpenInvite: () => void;
  className?: string;
  /** Name of the navigation, when it is not inside a named dialog. */
  label?: string;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const showOffers = useOptionalSettings()?.settings?.showOffers !== false;
  const sections = DASHBOARD_SECTIONS.filter(
    (s) => s.id !== 'offers' || (offersEnabled() && showOffers)
  );
  return (
    <nav className={`burger-nav${className ? ` ${className}` : ''}`} aria-label={label}>
      {SECTION_GROUPS.map((group) => (
        <div
          key={group}
          className="burger-nav-group"
          role="group"
          aria-label={t(`app.menu.group.${group}`)}
        >
          <h3 className="burger-nav-group-title" aria-hidden="true">
            {t(`app.menu.group.${group}`)}
          </h3>
          {group === 'account' && (
            <button
              className="burger-nav-item"
              onClick={onOpenProfile}
              style={{ '--section-color': GROUP_COLORS.account } as CSSProperties}
              aria-label={
                user?.name
                  ? t('app.header.openProfileOf', { name: user.name })
                  : t('app.header.openProfile')
              }
            >
              <span className="burger-nav-icon">
                {user?.avatar ? (
                  <span className="burger-nav-avatar" aria-hidden="true">
                    {user.avatar}
                  </span>
                ) : (
                  <Icon name="user" />
                )}
              </span>
              <span className="burger-nav-label">{t('app.menu.profile')}</span>
            </button>
          )}
          {sections
            .filter((s) => s.group === group)
            .map(({ id, icon, labelKey, color }) => (
              <button
                key={id}
                className={`burger-nav-item${tab === id ? ' burger-nav-item--active' : ''}`}
                onClick={() => onSelectTab(id)}
                aria-current={tab === id ? 'page' : undefined}
                data-tour={id === 'plan' ? 'plan' : undefined}
                style={{ '--section-color': color } as CSSProperties}
              >
                <span className="burger-nav-icon">
                  <Icon name={icon} />
                </span>
                <span className="burger-nav-label">{t(labelKey)}</span>
                {tab === id && <span className="burger-nav-dot" aria-hidden="true" />}
              </button>
            ))}
          {group === 'account' && (
            <button
              className="burger-nav-item burger-nav-item--wide"
              onClick={onOpenInvite}
              style={{ '--section-color': GROUP_COLORS.account } as CSSProperties}
              data-testid="menu-invite"
            >
              <span className="burger-nav-icon">
                <Icon name="gift" />
              </span>
              <span className="burger-nav-text">
                <span className="burger-nav-label">{t('app.menu.invite')}</span>
                <span className="burger-nav-sub">{t('app.menu.inviteSub')}</span>
              </span>
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}

/** Side menu with every section; the offers entry hides when the user turned offers off. */
export function BurgerMenu({
  open,
  tab,
  onSelectTab,
  onOpenProfile,
  onOpenInvite,
  onClose,
}: BurgerMenuProps) {
  const { t } = useI18n();
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // No page scroll behind the open menu.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <div
        className={`burger-overlay${open ? ' burger-overlay--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panel}
        className={`burger-panel${open ? ' burger-panel--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('app.menu.ariaLabel')}
        aria-hidden={!open}
        inert={!open}
        tabIndex={-1}
      >
        {open && <MenuFocus panel={panel} closeButton={closeButton} onClose={onClose} />}
        <div className="burger-panel-header">
          <div className="burger-brand">
            <BrandLogo className="burger-brand-logo" size={28} />
            <span className="burger-brand-name">{t('app.header.title')}</span>
          </div>
          <button
            ref={closeButton}
            className="burger-close-btn"
            onClick={onClose}
            aria-label={t('app.menu.close')}
          >
            <Icon name="close" />
          </button>
        </div>
        <MenuNav
          tab={tab}
          onSelectTab={(id) => {
            onSelectTab(id);
            onClose();
          }}
          onOpenProfile={() => {
            onOpenProfile();
            onClose();
          }}
          onOpenInvite={() => {
            onOpenInvite();
            onClose();
          }}
        />
      </aside>
    </>
  );
}
