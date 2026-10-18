import { useEffect, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import type { PremiumVideoIds } from '../domain/videos';

/** The way to Premium from a locked video: a page to go to, or an action (the upgrade dialog). */
export type PremiumUnlock = { to: string } | { onClick: () => void };

export interface PremiumVideos {
  /** The YouTube ids of the Premium videos, for Premium users only (null for the rest). */
  ids: PremiumVideoIds | null;
  /** The call to action of the locked cards; null when there is none (plan still loading…). */
  unlock: PremiumUnlock | null;
}

/** The public page: Premium videos are locked and lead to the pricing page. */
export const PUBLIC_PREMIUM_VIDEOS: PremiumVideos = { ids: null, unlock: { to: '/pricing' } };

/** In the app: Premium users get the ids from the server; the rest, the upgrade dialog. */
export function usePremiumVideos(): PremiumVideos {
  const { videosApi } = useApi();
  const plan = useOptionalPlan();
  const known = !!plan && (!plan.loading || !!plan.overview);
  const premium = known && plan.isPremium;
  const [ids, setIds] = useState<PremiumVideoIds | null>(null);

  useEffect(() => {
    if (!premium) return;
    // A refusal (the plan just ended) leaves them locked.
    videosApi.premium().then(setIds, () => setIds({}));
  }, [premium, videosApi]);

  if (!plan) return PUBLIC_PREMIUM_VIDEOS;
  if (!known) return { ids: null, unlock: null };
  if (premium) return { ids, unlock: null };
  return { ids: null, unlock: { onClick: () => plan.openUpgrade() } };
}
