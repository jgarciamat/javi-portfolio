import type { DashboardTab } from '../navigation';

export interface TourStep {
  /** Text keys: `app.tour.<id>.title` and `app.tour.<id>.body`. */
  id: string;
  /** Section the step talks about (opened before showing it). */
  tab?: DashboardTab;
  /** CSS selector of what to highlight; without it (or when missing) the card is centred. */
  target?: string;
  /** On phones, a smaller part of `target`: the whole would not fit above the card. */
  phoneTarget?: string;
}

/**
 * Version of the tour. Raise it when the tour changes a lot: whoever turned the tour off is then
 * offered the new one once (discreetly), and the «seen» mark is kept per version.
 */
export const TOUR_VERSION = 3;

const SECTION = '[data-tour="section"]';
const WIZARD_ROUTE = '[data-tour="wizard-route"]';

/** What the app looks like today, in the order a person meets it. */
const STEPS: TourStep[] = [
  { id: 'welcome', tab: 'monthly' },
  { id: 'monthNav', tab: 'monthly', target: '[data-tour="month-nav"]' },
  { id: 'monthActions', tab: 'monthly', target: '[data-tour="month-actions"]' },
  { id: 'import', tab: 'monthly', target: '[data-tour="import"]' },
  { id: 'summary', tab: 'monthly', target: '[data-tour="summary"]' },
  { id: 'forecast', tab: 'monthly', target: '[data-tour="forecast"]' },
  { id: 'aiAdvisor', tab: 'monthly', target: '.ai-advisor' },
  { id: 'newTransaction', tab: 'monthly', target: '[data-tour="new-transaction"]' },
  { id: 'movements', tab: 'monthly', target: '[data-tour="movements"]' },
  { id: 'selection', tab: 'monthly', target: '[data-tour="movements"]' },
  { id: 'budgets', tab: 'budgets', target: SECTION },
  { id: 'goals', tab: 'goals', target: SECTION },
  { id: 'split', tab: 'split', target: '[data-tour="split-new"]' },
  { id: 'splitSettle', tab: 'split' },
  { id: 'automations', tab: 'automations', target: SECTION },
  { id: 'automationsNew', tab: 'automations', target: '[data-tour="recurring-new"]' },
  { id: 'menu', tab: 'monthly', target: '.burger-btn' },
  { id: 'invite', tab: 'monthly', target: '.burger-btn' },
  { id: 'profile', tab: 'monthly', target: '.burger-btn' },
  { id: 'learn', tab: 'monthly', target: '[data-tour="learn-btn"]' },
  { id: 'rentaIntro', tab: 'renta' },
  { id: 'rentaSteps', tab: 'renta', target: WIZARD_ROUTE },
  { id: 'rentaTools', tab: 'renta', target: '[data-tour="wizard-tools"]' },
  { id: 'rentaResult', tab: 'renta', target: WIZARD_ROUTE },
  { id: 'rentaLimits', tab: 'renta' },
  { id: 'rentaPlan', tab: 'renta' },
  { id: 'autoIntro', tab: 'business' },
  { id: 'autoSteps', tab: 'business', target: WIZARD_ROUTE },
  { id: 'autoInvoices', tab: 'business', target: WIZARD_ROUTE },
  { id: 'autoQuarter', tab: 'business', target: WIZARD_ROUTE },
  { id: 'autoModels', tab: 'business', target: WIZARD_ROUTE },
  { id: 'autoFiles', tab: 'business', target: WIZARD_ROUTE },
  { id: 'autoLimits', tab: 'business' },
  { id: 'autoPlan', tab: 'business' },
  { id: 'cryptoIntro', tab: 'crypto' },
  { id: 'cryptoChart', tab: 'crypto', target: '.cc-market-chart', phoneTarget: '.cc-layers' },
  { id: 'cryptoTrade', tab: 'crypto', target: '.cc-order' },
  { id: 'settings', tab: 'settings', target: SECTION },
  { id: 'done', tab: 'monthly' },
];

/** Steps whose text depends on the plan: `<id>Free` or `<id>Premium`. Nothing pushes to buy. */
const BY_PLAN = new Set(['automationsNew', 'rentaPlan', 'autoPlan']);

export function tourSteps(premium: boolean): TourStep[] {
  return STEPS.map((step) =>
    BY_PLAN.has(step.id) ? { ...step, id: `${step.id}${premium ? 'Premium' : 'Free'}` } : step
  );
}
