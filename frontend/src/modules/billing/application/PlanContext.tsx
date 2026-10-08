import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useApi } from '@core/context/ApiContext';
import { ApiError, registerPaymentRequiredHandler } from '@core/api/http';
import { redirectTo } from '@shared/utils/navigation';
import type {
  BillingOverview,
  CheckoutConsent,
  CheckoutKind,
  LimitedResource,
  PremiumFeature,
  UpgradeReason,
} from '../domain/types';
import { UpgradeModal } from '../ui/UpgradeModal';

export type BillingNotice = 'success' | 'cancel' | 'portal';

interface PlanContextValue {
  overview: BillingOverview | null;
  loading: boolean;
  /** Unknown plan (still loading or failed) counts as Premium: the API enforces the limits anyway. */
  isPremium: boolean;
  refresh: () => Promise<BillingOverview | null>;
  upgradeReason: UpgradeReason | null;
  openUpgrade: (reason?: UpgradeReason) => void;
  closeUpgrade: () => void;
  checkout: (kind: CheckoutKind, consent: CheckoutConsent) => Promise<void>;
  openPortal: () => Promise<void>;
  notice: BillingNotice | null;
  dismissNotice: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

/** Turns a 402 from the API into the reason shown in the upgrade dialog. */
export function reasonFromError(error: ApiError): UpgradeReason {
  const details = error.details ?? {};
  if (error.code === 'PLAN_LIMIT' && typeof details.resource === 'string') {
    return {
      kind: 'limit',
      resource: details.resource as LimitedResource,
      limit: Number(details.limit ?? 0),
    };
  }
  if (error.code === 'PREMIUM_REQUIRED' && typeof details.feature === 'string') {
    return { kind: 'feature', feature: details.feature as PremiumFeature };
  }
  return { kind: 'generic' };
}

const NOTICES: BillingNotice[] = ['success', 'cancel', 'portal'];

/** `?billing=…` set by the payment provider when it sends the user back. */
function readNotice(): BillingNotice | null {
  const value = new URLSearchParams(window.location.search).get('billing');
  return NOTICES.find((n) => n === value) ?? null;
}

function clearNoticeFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('billing');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const { billingApi } = useApi();
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null);
  const [notice, setNotice] = useState<BillingNotice | null>(readNotice);

  const refresh = useCallback(async () => {
    try {
      const data = await billingApi.get();
      setOverview(data);
      return data;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [billingApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Back from the payment page: the webhook may land a few seconds later.
  useEffect(() => {
    if (!notice) return;
    clearNoticeFromUrl();
    if (notice !== 'success') return;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      const data = await refresh();
      if (data?.plan === 'premium' && data.subscription.source !== 'trial') attempts = 10;
      if (attempts >= 10) window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [notice, refresh]);

  useEffect(() => {
    registerPaymentRequiredHandler((error) => setUpgradeReason(reasonFromError(error)));
    return () => registerPaymentRequiredHandler(null);
  }, []);

  const checkout = useCallback(
    async (kind: CheckoutKind, consent: CheckoutConsent) => {
      const { url } = await billingApi.checkout(kind, consent);
      redirectTo(url);
    },
    [billingApi]
  );

  const openPortal = useCallback(async () => {
    const { url } = await billingApi.portal();
    redirectTo(url);
  }, [billingApi]);

  const value = useMemo<PlanContextValue>(
    () => ({
      overview,
      loading,
      isPremium: overview?.plan !== 'free',
      refresh,
      upgradeReason,
      openUpgrade: (reason = { kind: 'generic' }) => setUpgradeReason(reason),
      closeUpgrade: () => setUpgradeReason(null),
      checkout,
      openPortal,
      notice,
      dismissNotice: () => setNotice(null),
    }),
    [overview, loading, refresh, upgradeReason, checkout, openPortal, notice]
  );

  return (
    <PlanContext.Provider value={value}>
      {children}
      {upgradeReason && <UpgradeModal reason={upgradeReason} />}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used inside PlanProvider');
  return ctx;
}

/** For components that may render outside the provider (tests, public pages). */
export function useOptionalPlan(): PlanContextValue | null {
  return useContext(PlanContext);
}
