import type { WizardStep } from '@modules/wizard/domain/wizard';

/** The steps of the self-employed assistant, in order, with about how long each one takes. */
export const AUTONOMO_STEPS: readonly WizardStep[] = [
  { id: 'activity', minutes: 3 },
  { id: 'import', minutes: 4 },
  { id: 'review', minutes: 4 },
  { id: 'quarter', minutes: 4 },
  { id: 'withholdings', minutes: 2 },
  { id: 'checks', minutes: 2 },
  { id: 'downloads', minutes: 2 },
  { id: 'renta', minutes: 1 },
];

/** Where the person is in it, on this device (and in the account copy with the rest). */
export const AUTONOMO_WIZARD_KEY = 'mm_autonomo_wizard';
/** Step by step or everything together. */
export const AUTONOMO_ASSISTANT_KEY = 'mm_autonomo_assistant';
