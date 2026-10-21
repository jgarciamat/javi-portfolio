import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { useAuth } from '@shared/hooks/useAuth';
import { storage } from '@shared/utils/storage';
import { TOUR_VERSION, tourSteps } from '../../ui/tour/tourSteps';
import type { DashboardTab } from '../../ui/navigation';

/** Newest version of the tour this device has shown (or offered). Per version: a new one is offered again. */
export const TOUR_SEEN_KEY = 'finanverso.tour.seenVersion';

const seenVersion = (): number => Number(storage.get(TOUR_SEEN_KEY)) || 0;
const markSeen = () => storage.set(TOUR_SEEN_KEY, String(TOUR_VERSION));

/**
 * The guided tour: opens after every sign-in until the user ticks "don't show
 * again" (saved in the account, so it applies on every device), and on demand
 * from Settings. When it ends, the user is back where it started.
 * Whoever turned it off and has not seen this version of the tour is offered it once, in a
 * discreet notice that does not block anything.
 */
export function useWelcomeTour(tab: DashboardTab, setTab: (tab: DashboardTab) => void) {
  const { freshSignIn, acknowledgeSignIn } = useAuth();
  const settingsContext = useOptionalSettings();
  const plan = useOptionalPlan();
  const settings = settingsContext?.settings ?? null;
  /** Section to return to when the tour ends; null while it is closed. */
  const [origin, setOrigin] = useState<DashboardTab | null>(null);
  const [offer, setOffer] = useState(false);

  useEffect(() => {
    if (!freshSignIn || !settings) return;
    acknowledgeSignIn();
    if (settings.showTour) setOrigin('monthly');
    else if (seenVersion() < TOUR_VERSION) setOffer(true);
  }, [freshSignIn, settings, acknowledgeSignIn]);

  const start = useCallback(() => setOrigin(tab), [tab]);
  const dontShowAgain = settings?.showTour === false;

  const close = useCallback(
    (dontShowNow: boolean) => {
      markSeen();
      setTab(origin as DashboardTab);
      setOrigin(null);
      // Only an actual change of the preference is saved.
      if (dontShowNow !== dontShowAgain) {
        settingsContext!.updateSettings({ showTour: !dontShowNow }).catch(() => undefined);
      }
    },
    [origin, setTab, dontShowAgain, settingsContext]
  );

  /** The notice: «see it» starts the tour from the first step; «not now» only hides it. */
  const answerOffer = useCallback((accepted: boolean) => {
    markSeen();
    setOffer(false);
    if (accepted) setOrigin('monthly');
  }, []);

  const premium = plan?.isPremium === true;
  const steps = useMemo(() => tourSteps(premium), [premium]);

  return {
    open: origin !== null,
    offer,
    answerOffer,
    start,
    close,
    steps,
    dontShowAgain,
  };
}
