import { useEffect } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { useEscapeKey } from '@shared/hooks/useEscapeKey';
import { DASHBOARD_SECTIONS, SECTION_GROUPS, type DashboardTab } from '../navigation';
import '../css/Sections.css';

interface BurgerMenuProps {
  open: boolean;
  tab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onClose: () => void;
}

/** Side menu with every section; the offers entry hides when the user turned offers off. */
export function BurgerMenu({ open, tab, onSelectTab, onClose }: BurgerMenuProps) {
  const { t } = useI18n();
  const showOffers = useOptionalSettings()?.settings?.showOffers !== false;
  const sections = DASHBOARD_SECTIONS.filter((s) => s.id !== 'offers' || showOffers);

  useEscapeKey(onClose, open);

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
        className={`burger-panel${open ? ' burger-panel--open' : ''}`}
        aria-label={t('app.menu.ariaLabel')}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="burger-panel-header">
          <div className="burger-brand">
            <span className="burger-brand-logo">💰</span>
            <span className="burger-brand-name">{t('app.header.title')}</span>
          </div>
          <button className="burger-close-btn" onClick={onClose} aria-label={t('app.menu.close')}>
            ✕
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
                    <span className="burger-nav-icon">{icon}</span>
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
