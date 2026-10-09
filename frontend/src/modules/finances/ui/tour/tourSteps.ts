import type { DashboardTab } from '../navigation';

export interface TourStep {
  /** Text keys: `app.tour.<id>.title` and `app.tour.<id>.body`. */
  id: string;
  /** Section the step talks about (opened before showing it). */
  tab?: DashboardTab;
  /** CSS selector of what to highlight; without it (or when missing) the card is centred. */
  target?: string;
}

const SECTION = '[data-tour="section"]';

/** Every part of the app, in the order a new user meets it. */
const STEPS: TourStep[] = [
  { id: 'welcome', tab: 'monthly' },
  { id: 'monthNav', tab: 'monthly', target: '[data-tour="month-nav"]' },
  { id: 'options', tab: 'monthly', target: '.month-nav .options-dropdown' },
  { id: 'summary', tab: 'monthly', target: '[data-tour="summary"]' },
  { id: 'forecast', tab: 'monthly', target: '[data-tour="forecast"]' },
  { id: 'newTransaction', tab: 'monthly', target: '[data-tour="new-transaction"]' },
  { id: 'movements', tab: 'monthly', target: '[data-tour="movements"]' },
  { id: 'aiAdvisor', tab: 'monthly', target: '.ai-advisor' },
  { id: 'menu', tab: 'monthly', target: '.burger-btn' },
  { id: 'annual', tab: 'annual', target: SECTION },
  { id: 'analysis', tab: 'analysis', target: SECTION },
  { id: 'search', tab: 'search', target: SECTION },
  { id: 'accounts', tab: 'accounts', target: SECTION },
  { id: 'budgets', tab: 'budgets', target: SECTION },
  { id: 'goals', tab: 'goals', target: SECTION },
  { id: 'automations', tab: 'automations', target: SECTION },
  { id: 'alerts', tab: 'custom-alerts', target: SECTION },
  { id: 'plan', tab: 'plan', target: SECTION },
  { id: 'offers', tab: 'offers', target: SECTION },
  { id: 'settings', tab: 'settings', target: SECTION },
  { id: 'profile', target: '.header-user-btn' },
  { id: 'language', target: '.header-actions .lang-switcher' },
  { id: 'done', tab: 'monthly' },
];

/** The tour skips the offers section when the user has hidden it. */
export function tourSteps(showOffers: boolean): TourStep[] {
  return STEPS.filter((step) => step.id !== 'offers' || showOffers);
}
