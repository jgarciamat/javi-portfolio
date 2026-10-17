/** Sections reachable from the navigation menu. */
export type DashboardTab =
  | 'monthly'
  | 'annual'
  | 'analysis'
  | 'health'
  | 'search'
  | 'accounts'
  | 'budgets'
  | 'goals'
  | 'split'
  | 'assets'
  | 'business'
  | 'renta'
  | 'hacienda'
  | 'learn'
  | 'invest'
  | 'automations'
  | 'custom-alerts'
  | 'plan'
  | 'offers'
  | 'settings';

/** Partner offers are hidden until there is a real one to show. */
export const offersEnabled = (): boolean => false;

export interface DashboardSection {
  id: DashboardTab;
  icon: string;
  labelKey: string;
  /** Groups shown as separate blocks in the menu. */
  group: 'overview' | 'planning' | 'tools';
}

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  { id: 'monthly', icon: 'calendar', labelKey: 'app.tabs.monthly', group: 'overview' },
  { id: 'annual', icon: 'chart', labelKey: 'app.tabs.annual', group: 'overview' },
  { id: 'analysis', icon: 'trend', labelKey: 'app.tabs.analysis', group: 'overview' },
  { id: 'health', icon: 'heart', labelKey: 'app.tabs.health', group: 'overview' },
  { id: 'search', icon: 'search', labelKey: 'app.tabs.search', group: 'overview' },
  { id: 'accounts', icon: 'bank', labelKey: 'app.tabs.accounts', group: 'planning' },
  { id: 'budgets', icon: 'target', labelKey: 'app.tabs.budgets', group: 'planning' },
  { id: 'goals', icon: 'flag', labelKey: 'app.tabs.goals', group: 'planning' },
  { id: 'split', icon: 'handshake', labelKey: 'app.tabs.split', group: 'planning' },
  { id: 'assets', icon: 'wallet', labelKey: 'app.tabs.assets', group: 'planning' },
  { id: 'business', icon: 'briefcase', labelKey: 'app.tabs.business', group: 'planning' },
  { id: 'renta', icon: 'file', labelKey: 'app.tabs.renta', group: 'planning' },
  { id: 'hacienda', icon: 'compass', labelKey: 'app.tabs.hacienda', group: 'planning' },
  { id: 'automations', icon: 'settings', labelKey: 'app.tabs.automations', group: 'planning' },
  { id: 'custom-alerts', icon: 'bell', labelKey: 'app.tabs.customAlerts', group: 'planning' },
  { id: 'learn', icon: 'book', labelKey: 'app.tabs.learn', group: 'tools' },
  { id: 'invest', icon: 'coins', labelKey: 'app.tabs.invest', group: 'tools' },
  { id: 'plan', icon: 'star', labelKey: 'app.tabs.plan', group: 'tools' },
  { id: 'offers', icon: 'gift', labelKey: 'app.tabs.offers', group: 'tools' },
  { id: 'settings', icon: 'wrench', labelKey: 'app.tabs.settings', group: 'tools' },
];

export const SECTION_BY_ID = Object.fromEntries(DASHBOARD_SECTIONS.map((s) => [s.id, s])) as Record<
  DashboardTab,
  DashboardSection
>;

export const SECTION_GROUPS: DashboardSection['group'][] = ['overview', 'planning', 'tools'];

export const isDashboardTab = (value: unknown): value is DashboardTab =>
  DASHBOARD_SECTIONS.some((s) => s.id === value);
