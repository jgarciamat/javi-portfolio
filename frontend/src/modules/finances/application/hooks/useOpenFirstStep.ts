import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FirstStepId } from '@modules/billing/domain/types';
import type { DashboardTab } from '../../ui/navigation';

const TAB_OF: Record<Exclude<FirstStepId, 'movements'>, DashboardTab> = {
  budgets: 'budgets',
  goals: 'goals',
  automations: 'automations',
};

/** Opens where a first step is done: the new-transaction form of the month, or its section. */
export function useOpenFirstStep(onOpenTab: (tab: DashboardTab) => void) {
  const [, setParams] = useSearchParams();
  return useCallback(
    (id: FirstStepId) => {
      if (id !== 'movements') return onOpenTab(TAB_OF[id]);
      onOpenTab('monthly');
      setParams({ add: 'expense' }, { replace: true });
    },
    [onOpenTab, setParams]
  );
}
