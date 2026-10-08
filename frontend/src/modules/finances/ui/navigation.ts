/** Sections reachable from the navigation menu. */
export type DashboardTab =
  | 'monthly'
  | 'annual'
  | 'analysis'
  | 'search'
  | 'accounts'
  | 'budgets'
  | 'goals'
  | 'automations'
  | 'custom-alerts'
  | 'plan'
  | 'offers'
  | 'settings';

export interface DashboardSection {
  id: DashboardTab;
  icon: string;
  labelKey: string;
  /** Groups shown as separate blocks in the menu. */
  group: 'overview' | 'planning' | 'tools';
}

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  { id: 'monthly', icon: '📅', labelKey: 'app.tabs.monthly', group: 'overview' },
  { id: 'annual', icon: '📊', labelKey: 'app.tabs.annual', group: 'overview' },
  { id: 'analysis', icon: '📈', labelKey: 'app.tabs.analysis', group: 'overview' },
  { id: 'search', icon: '🔎', labelKey: 'app.tabs.search', group: 'overview' },
  { id: 'accounts', icon: '🏦', labelKey: 'app.tabs.accounts', group: 'planning' },
  { id: 'budgets', icon: '🎯', labelKey: 'app.tabs.budgets', group: 'planning' },
  { id: 'goals', icon: '🏁', labelKey: 'app.tabs.goals', group: 'planning' },
  { id: 'automations', icon: '⚙️', labelKey: 'app.tabs.automations', group: 'planning' },
  { id: 'custom-alerts', icon: '🔔', labelKey: 'app.tabs.customAlerts', group: 'planning' },
  { id: 'plan', icon: '⭐', labelKey: 'app.tabs.plan', group: 'tools' },
  { id: 'offers', icon: '🎁', labelKey: 'app.tabs.offers', group: 'tools' },
  { id: 'settings', icon: '🛠️', labelKey: 'app.tabs.settings', group: 'tools' },
];

export const SECTION_BY_ID = Object.fromEntries(DASHBOARD_SECTIONS.map((s) => [s.id, s])) as Record<
  DashboardTab,
  DashboardSection
>;

export const SECTION_GROUPS: DashboardSection['group'][] = ['overview', 'planning', 'tools'];

export const isDashboardTab = (value: unknown): value is DashboardTab =>
  DASHBOARD_SECTIONS.some((s) => s.id === value);
