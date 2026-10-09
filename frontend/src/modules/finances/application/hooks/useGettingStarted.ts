import { useState } from 'react';
import { storage } from '@shared/utils/storage';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import type { DashboardTab } from '../../ui/navigation';

const STORAGE_KEY = 'mm_getting_started_hidden';
/** Movements a user registers before the app starts to feel useful. */
const MOVEMENTS_GOAL = 3;

export interface GettingStartedStep {
  id: 'movements' | 'budget' | 'goal' | 'recurring' | 'ai';
  done: boolean;
  /** Section that helps to complete it (none: it is done from the month view). */
  tab?: DashboardTab;
}

/** What a new user should try first, derived from what they have already created. */
export function useGettingStarted() {
  const overview = useOptionalPlan()?.overview ?? null;
  const [hidden, setHidden] = useState(() => storage.get(STORAGE_KEY) === '1');

  const steps: GettingStartedStep[] = overview
    ? [
        { id: 'movements', done: overview.usage.movements >= MOVEMENTS_GOAL },
        { id: 'budget', done: overview.usage.budgets > 0, tab: 'budgets' },
        { id: 'goal', done: overview.usage.goals > 0, tab: 'goals' },
        { id: 'recurring', done: overview.usage.recurringRules > 0, tab: 'automations' },
        { id: 'ai', done: overview.ai.used > 0 },
      ]
    : [];
  const completed = steps.filter((s) => s.done).length;

  return {
    steps,
    completed,
    visible: steps.length > 0 && completed < steps.length && !hidden,
    hide: () => {
      storage.set(STORAGE_KEY, '1');
      setHidden(true);
    },
  };
}
