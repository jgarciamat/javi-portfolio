import { useCallback, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { storage } from '@shared/utils/storage';

const LOCAL_KEY = 'mm_renta_uses';

/** `account`: inside the app (the plan decides); `local`: public page (one calculation per browser). */
export type RentaMode = 'account' | 'local';

export interface RentaAccess {
  /** The plan has no limit: the result is live. */
  premium: boolean;
  /** The plan is still loading. */
  loading: boolean;
  /** The free calculation was already used. */
  used: boolean;
  /** Counts a calculation; false when it was refused. */
  consume: () => Promise<boolean>;
  /** Opens the way to Premium (the upgrade dialog, or null outside the app). */
  upgrade: (() => void) | null;
}

export function useRentaAccess(mode: RentaMode): RentaAccess {
  const { rentaApi } = useApi();
  const plan = useOptionalPlan();
  const [localUsed, setLocalUsed] = useState(() => storage.get(LOCAL_KEY) === '1');

  const consumeAccount = useCallback(async () => {
    try {
      await rentaApi.register();
      await plan?.refresh();
      return true;
    } catch {
      // A refusal (402) already opens the upgrade dialog.
      await plan?.refresh();
      return false;
    }
  }, [rentaApi, plan]);

  if (mode === 'local' || !plan) {
    return {
      premium: false,
      loading: false,
      used: localUsed,
      consume: async () => {
        storage.set(LOCAL_KEY, '1');
        setLocalUsed(true);
        return true;
      },
      upgrade: null,
    };
  }

  const limit = plan.overview?.limits.resources.rentaCalculations;
  const max = limit ?? 1;
  const count = plan.overview?.usage.rentaCalculations ?? 0;
  return {
    premium: plan.isPremium && !!plan.overview && limit === null,
    loading: plan.loading && !plan.overview,
    used: limit !== null && limit !== undefined && count >= limit,
    consume: consumeAccount,
    upgrade: () => plan.openUpgrade({ kind: 'limit', resource: 'rentaCalculations', limit: max }),
  };
}
