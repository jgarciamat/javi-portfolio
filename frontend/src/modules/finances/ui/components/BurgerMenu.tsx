import { useEffect, useRef, type RefObject } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { BrandLogo } from '@shared/components/BrandLogo';
import { Icon } from '@shared/components/Icon';
import { useDialog } from '@shared/hooks/useDialog';
import {
  DASHBOARD_SECTIONS,
  offersEnabled,
  SECTION_GROUPS,
  type DashboardTab,
} from '../navigation';
import '../css/Sections.css';

interface BurgerMenuProps {
  open: boolean;
  tab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
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

/** Side menu with every section; the offers entry hides when the user turned offers off. */
export function BurgerMenu({ open, tab, onSelectTab, onClose }: BurgerMenuProps) {
  const { t } = useI18n();
  const showOffers = useOptionalSettings()?.settings?.showOffers !== false;
  const sections = DASHBOARD_SECTIONS.filter(
    (s) => s.id !== 'offers' || (offersEnabled() && showOffers)
  );

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
        <nav className="burger-nav">
          {SECTION_GROUPS.map((group) => (
            <div key={group} className="burger-nav-group">
              {sections
                .filter((s) => s.group === group)
                .map(({ id, icon, labelKey }) => (
                  <button
                    key={id}
                    className={`burger-nav-item${tab === id ? ' burger-nav-item--active' : ''}`}
                    onClick={() => {
                      onSelectTab(id);
                      onClose();
                    }}
                    aria-current={tab === id ? 'page' : undefined}
                  >
                    <span className="burger-nav-icon">
                      <Icon name={icon} />
                    </span>
                    <span className="burger-nav-label">{t(labelKey)}</span>
                    {tab === id && <span className="burger-nav-dot" aria-hidden="true" />}
                  </button>
                ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
