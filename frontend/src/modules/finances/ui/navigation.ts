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
  | 'videos'
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
  /** Colour that identifies the section in the menu and in its screen. */
  color: string;
  /** Groups shown as separate blocks in the menu. */
  group: 'overview' | 'planning' | 'tools';
}

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    id: 'monthly',
    icon: 'calendar',
    color: '#0ea5e9',
    labelKey: 'app.tabs.monthly',
    group: 'overview',
  },
  { id: 'annual', icon: 'chart', color: '#6366f1', labelKey: 'app.tabs.annual', group: 'overview' },
  {
    id: 'analysis',
    icon: 'trend',
    color: '#8b5cf6',
    labelKey: 'app.tabs.analysis',
    group: 'overview',
  },
  { id: 'health', icon: 'heart', color: '#f43f5e', labelKey: 'app.tabs.health', group: 'overview' },
  {
    id: 'search',
    icon: 'search',
    color: '#78716c',
    labelKey: 'app.tabs.search',
    group: 'overview',
  },
  {
    id: 'accounts',
    icon: 'bank',
    color: '#3b82f6',
    labelKey: 'app.tabs.accounts',
    group: 'planning',
  },
  {
    id: 'budgets',
    icon: 'target',
    color: '#f59e0b',
    labelKey: 'app.tabs.budgets',
    group: 'planning',
  },
  { id: 'goals', icon: 'flag', color: '#10b981', labelKey: 'app.tabs.goals', group: 'planning' },
  {
    id: 'split',
    icon: 'handshake',
    color: '#ec4899',
    labelKey: 'app.tabs.split',
    group: 'planning',
  },
  {
    id: 'assets',
    icon: 'wallet',
    color: '#14b8a6',
    labelKey: 'app.tabs.assets',
    group: 'planning',
  },
  {
    id: 'business',
    icon: 'briefcase',
    color: '#f97316',
    labelKey: 'app.tabs.business',
    group: 'planning',
  },
  { id: 'renta', icon: 'file', color: '#dc2626', labelKey: 'app.tabs.renta', group: 'planning' },
  {
    id: 'hacienda',
    icon: 'compass',
    color: '#06b6d4',
    labelKey: 'app.tabs.hacienda',
    group: 'planning',
  },
  {
    id: 'automations',
    icon: 'settings',
    color: '#64748b',
    labelKey: 'app.tabs.automations',
    group: 'planning',
  },
  {
    id: 'custom-alerts',
    icon: 'bell',
    color: '#eab308',
    labelKey: 'app.tabs.customAlerts',
    group: 'planning',
  },
  { id: 'learn', icon: 'book', color: '#22c55e', labelKey: 'app.tabs.learn', group: 'tools' },
  { id: 'invest', icon: 'coins', color: '#d946ef', labelKey: 'app.tabs.invest', group: 'tools' },
  { id: 'videos', icon: 'video', color: '#ef4444', labelKey: 'app.tabs.videos', group: 'tools' },
  { id: 'plan', icon: 'star', color: '#facc15', labelKey: 'app.tabs.plan', group: 'tools' },
  { id: 'offers', icon: 'gift', color: '#fb7185', labelKey: 'app.tabs.offers', group: 'tools' },
  {
    id: 'settings',
    icon: 'wrench',
    color: '#94a3b8',
    labelKey: 'app.tabs.settings',
    group: 'tools',
  },
];

export const SECTION_BY_ID = Object.fromEntries(DASHBOARD_SECTIONS.map((s) => [s.id, s])) as Record<
  DashboardTab,
  DashboardSection
>;

export const SECTION_GROUPS: DashboardSection['group'][] = ['overview', 'planning', 'tools'];

export const isDashboardTab = (value: unknown): value is DashboardTab =>
  DASHBOARD_SECTIONS.some((s) => s.id === value);
