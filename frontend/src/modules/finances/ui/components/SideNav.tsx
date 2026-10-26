import { useI18n } from '@core/i18n/I18nContext';
import type { DashboardTab } from '../navigation';
import { MenuNav } from './BurgerMenu';

/**
 * On a computer every section stays at the left, by groups, instead of behind the menu button:
 * there is room for it, and one click less to change section.
 */
export function SideNav({
  tab,
  onSelectTab,
  onOpenProfile,
  onOpenInvite,
}: {
  tab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenProfile: () => void;
  onOpenInvite: () => void;
}) {
  const { t } = useI18n();
  return (
    <aside className="side-nav" data-tour="menu">
      <MenuNav
        tab={tab}
        onSelectTab={onSelectTab}
        onOpenProfile={onOpenProfile}
        onOpenInvite={onOpenInvite}
        className="side-nav-list"
        label={t('app.menu.ariaLabel')}
      />
    </aside>
  );
}
