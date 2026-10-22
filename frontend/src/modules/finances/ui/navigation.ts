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
  | 'crypto'
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
  /** Colour of its group, in the menu and in its screen. */
  color: string;
  /** Groups shown as separate blocks in the menu. */
  group: 'overview' | 'money' | 'work' | 'learn' | 'account';
  /** Shorter name for the menu tiles, when the full one wraps. */
  menuKey?: string;
}

/** One soft colour per menu group: its icons, and the screens under it, share it. */
export const GROUP_COLORS: Record<DashboardSection['group'], string> = {
  overview: '#8ec5f5',
  money: '#8fd9a8',
  work: '#f5b895',
  learn: '#85d8d2',
  account: '#f2d77e',
};

const SECTIONS: Omit<DashboardSection, 'color'>[] = [
  {
    id: 'monthly',
    icon: 'calendar',
    labelKey: 'app.tabs.monthly',
    group: 'overview',
  },
  { id: 'annual', icon: 'chart', labelKey: 'app.tabs.annual', group: 'overview' },
  {
    id: 'analysis',
    icon: 'trend',
    labelKey: 'app.tabs.analysis',
    group: 'overview',
  },
  { id: 'health', icon: 'heart', labelKey: 'app.tabs.health', group: 'overview' },
  {
    id: 'search',
    icon: 'search',
    labelKey: 'app.tabs.search',
    group: 'overview',
  },
  {
    id: 'accounts',
    icon: 'bank',
    labelKey: 'app.tabs.accounts',
    group: 'money',
  },
  {
    id: 'budgets',
    icon: 'target',
    labelKey: 'app.tabs.budgets',
    group: 'money',
  },
  { id: 'goals', icon: 'flag', labelKey: 'app.tabs.goals', group: 'money' },
  {
    id: 'split',
    icon: 'handshake',
    labelKey: 'app.tabs.split',
    group: 'money',
  },
  {
    id: 'assets',
    icon: 'wallet',
    labelKey: 'app.tabs.assets',
    group: 'money',
  },
  {
    id: 'business',
    icon: 'briefcase',
    labelKey: 'app.tabs.business',
    group: 'work',
  },
  { id: 'renta', icon: 'file', labelKey: 'app.tabs.renta', group: 'work' },
  {
    id: 'hacienda',
    icon: 'compass',
    labelKey: 'app.tabs.hacienda',
    menuKey: 'app.menu.short.hacienda',
    group: 'work',
  },
  {
    id: 'automations',
    icon: 'settings',
    labelKey: 'app.tabs.automations',
    menuKey: 'app.menu.short.automations',
    group: 'money',
  },
  {
    id: 'custom-alerts',
    icon: 'bell',
    labelKey: 'app.tabs.customAlerts',
    group: 'money',
  },
  { id: 'learn', icon: 'book', labelKey: 'app.tabs.learn', group: 'learn' },
  { id: 'invest', icon: 'coins', labelKey: 'app.tabs.invest', group: 'learn' },
  { id: 'crypto', icon: 'candles', labelKey: 'app.tabs.crypto', group: 'learn' },
  { id: 'videos', icon: 'video', labelKey: 'app.tabs.videos', group: 'learn' },
  { id: 'plan', icon: 'star', labelKey: 'app.tabs.plan', group: 'account' },
  { id: 'offers', icon: 'gift', labelKey: 'app.tabs.offers', group: 'account' },
  {
    id: 'settings',
    icon: 'wrench',
    labelKey: 'app.tabs.settings',
    group: 'account',
  },
];

export const DASHBOARD_SECTIONS: DashboardSection[] = SECTIONS.map((section) => ({
  ...section,
  color: GROUP_COLORS[section.group],
}));

export const SECTION_BY_ID = Object.fromEntries(DASHBOARD_SECTIONS.map((s) => [s.id, s])) as Record<
  DashboardTab,
  DashboardSection
>;

export const SECTION_GROUPS: DashboardSection['group'][] = [
  'overview',
  'money',
  'work',
  'learn',
  'account',
];

export const isDashboardTab = (value: unknown): value is DashboardTab =>
  DASHBOARD_SECTIONS.some((s) => s.id === value);
