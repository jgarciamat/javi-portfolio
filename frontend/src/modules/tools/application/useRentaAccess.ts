import { useCallback, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { playBillingAvailable } from '@core/billing/playStore';
import { isNativeApp } from '@shared/utils/platform';
import type { CheckoutConsent } from '@modules/billing/domain/types';
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
  draft: DraftAccess;
}

/** Reading a tax return draft: included with over two months of Premium, or with the one-month pass. */
export interface DraftAccess {
  allowed: boolean;
  /** When paid Premium reaches the two months (null: never, or already). */
  eligibleOn: string | null;
  /** Until when the pass lasts. */
  passUntil: string | null;
  /** The pass can be bought here (the web needs the terms first; Google Play has its own sheet). */
  canBuy: boolean;
  consentRequired: boolean;
  price: number | null;
  /** Registers the use on the server; false when it was refused. */
  use: () => Promise<boolean>;
  buy: (consent: CheckoutConsent) => Promise<void>;
}

const NO_DRAFT: DraftAccess = {
  allowed: false,
  eligibleOn: null,
  passUntil: null,
  canBuy: false,
  consentRequired: false,
  price: null,
  use: async () => false,
  buy: async () => undefined,
};

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
      draft: NO_DRAFT,
    };
  }

  const renta = plan.overview?.renta;
  const catalog = plan.overview?.catalog;
  const onWeb = !isNativeApp();
  const draft: DraftAccess = {
    allowed: !!renta?.draft.allowed,
    eligibleOn: renta?.eligibleOn ?? null,
    passUntil: renta?.passUntil ?? null,
    canBuy:
      !!catalog?.rentaPass.available &&
      (playBillingAvailable() || (onWeb && catalog.paymentsEnabled)),
    consentRequired: !playBillingAvailable(),
    price: catalog?.prices.rentaPass ?? null,
    use: async () => {
      try {
        await rentaApi.draft();
        return true;
      } catch {
        await plan.refresh();
        return false;
      }
    },
    buy: (consent) => plan.checkout('renta_pass', consent),
  };

  const limit = plan.overview?.limits.resources.rentaCalculations;
  const max = limit ?? 1;
  const count = plan.overview?.usage.rentaCalculations ?? 0;
  return {
    premium: (plan.isPremium && !!plan.overview && limit === null) || !!renta?.passUntil,
    loading: plan.loading && !plan.overview,
    used: limit !== null && limit !== undefined && count >= limit && !renta?.passUntil,
    consume: consumeAccount,
    upgrade: () => plan.openUpgrade({ kind: 'limit', resource: 'rentaCalculations', limit: max }),
    draft,
  };
}
