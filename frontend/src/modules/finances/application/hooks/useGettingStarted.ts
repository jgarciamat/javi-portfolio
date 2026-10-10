import { useCallback, useEffect, useState } from 'react';
import { storage } from '@shared/utils/storage';
import { useAuth } from '@shared/hooks/useAuth';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import type { BillingOverview } from '@modules/billing/domain/types';
import { useFinances } from '../FinancesContext';
import type { DashboardTab } from '../../ui/navigation';

const HIDDEN_KEY = 'mm_getting_started_hidden';
/** Steps done once stay done: deleting the budget later, or a new month, does not untick them. */
const doneKey = (userId: string) => `mm_getting_started_done:${userId}`;
/** Movements a user registers before the app starts to feel useful. */
const MOVEMENTS_GOAL = 3;

export type GettingStartedStepId = 'movements' | 'budget' | 'goal' | 'recurring' | 'ai';

export interface GettingStartedStep {
  id: GettingStartedStepId;
  done: boolean;
  /** Section that helps to complete it (none: it is done from the month view). */
  tab?: DashboardTab;
}

const STEPS: Omit<GettingStartedStep, 'done'>[] = [
  { id: 'movements' },
  { id: 'budget', tab: 'budgets' },
  { id: 'goal', tab: 'goals' },
  { id: 'recurring', tab: 'automations' },
  { id: 'ai' },
];

/** Steps the user's data already shows as done. */
function reachedSteps(overview: BillingOverview): GettingStartedStepId[] {
  const { usage, ai } = overview;
  const reached: [GettingStartedStepId, boolean][] = [
    ['movements', usage.movements >= MOVEMENTS_GOAL],
    ['budget', usage.budgets > 0],
    ['goal', usage.goals > 0],
    ['recurring', usage.recurringRules > 0],
    ['ai', ai.used > 0],
  ];
  return reached.filter(([, done]) => done).map(([id]) => id);
}

/**
 * What a new user should try first, derived from what they have created. The
 * counts are fetched again whenever the month view opens (coming back from the
 * section where the step was done) and whenever a movement is added or removed.
 * Once every step is done the checklist goes away.
 */
export function useGettingStarted() {
  const plan = useOptionalPlan();
  const overview = plan?.overview ?? null;
  const userId = useAuth().user?.id ?? '';
  const movementsThisMonth = useFinances().transactions.length;
  const [hidden, setHidden] = useState(() => storage.get(HIDDEN_KEY) === '1');
  const [remembered, setRemembered] = useState(() =>
    storage.getJSON<GettingStartedStepId[]>(doneKey(userId), [])
  );

  const refresh = plan?.refresh;
  useEffect(() => {
    void refresh?.();
  }, [refresh, movementsThisMonth]);

  const reached = overview ? reachedSteps(overview) : [];

  const remember = useCallback(
    (ids: GettingStartedStepId[]) => {
      const missing = ids.filter((id) => !remembered.includes(id));
      if (missing.length === 0) return;
      const next = [...remembered, ...missing];
      storage.setJSON(doneKey(userId), next);
      setRemembered(next);
    },
    [remembered, userId]
  );

  const reachedKey = reached.join(',');
  useEffect(() => {
    if (reachedKey) remember(reachedKey.split(',') as GettingStartedStepId[]);
  }, [reachedKey, remember]);

  const steps: GettingStartedStep[] = overview
    ? STEPS.map((step) => ({
        ...step,
        done: remembered.includes(step.id) || reached.includes(step.id),
      }))
    : [];
  const completed = steps.filter((s) => s.done).length;

  return {
    steps,
    completed,
    visible: steps.length > 0 && completed < steps.length && !hidden,
    /** Marks a step done from the month view (an analysis, with or without the AI provider). */
    complete: (id: GettingStartedStepId) => remember([id]),
    hide: () => {
      storage.set(HIDDEN_KEY, '1');
      setHidden(true);
    },
  };
}
