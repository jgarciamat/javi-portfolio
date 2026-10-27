import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { useAuth } from '@shared/hooks/useAuth';
import { storage } from '@shared/utils/storage';
import {
  sectionGuideSteps,
  shortTourSteps,
  TOUR_VERSION,
  tourSteps,
} from '../../ui/tour/tourSteps';
import type { DashboardTab } from '../../ui/navigation';

/** Newest version of the tour this device has shown (or offered). Per version: a new one is offered again. */
export const TOUR_SEEN_KEY = 'finanverso.tour.seenVersion';

const seenVersion = (): number => Number(storage.get(TOUR_SEEN_KEY)) || 0;
const markSeen = () => storage.set(TOUR_SEEN_KEY, String(TOUR_VERSION));

/** Which walk is open: the short one of the sign-in, the full one, or the guide of a section. */
export type TourKind = 'short' | 'full' | 'guide';

interface Run {
  kind: TourKind;
  /** Section to return to when it ends (for a guide, the section it explains). */
  origin: DashboardTab;
}

/**
 * The guided tour: the short one opens after every sign-in until the user ticks "don't show
 * again" (saved in the account, so it applies on every device); the full one and the guide of
 * each section, on demand. When it ends, the user is back where it started.
 * Whoever turned it off and has not seen this version of the tour is offered it once, in a
 * discreet notice that does not block anything.
 */
export function useWelcomeTour(tab: DashboardTab, setTab: (tab: DashboardTab) => void) {
  const { freshSignIn, acknowledgeSignIn } = useAuth();
  const settingsContext = useOptionalSettings();
  const plan = useOptionalPlan();
  const settings = settingsContext?.settings ?? null;
  /** Null while it is closed. */
  const [run, setRun] = useState<Run | null>(null);
  const [offer, setOffer] = useState(false);

  useEffect(() => {
    if (!freshSignIn || !settings) return;
    acknowledgeSignIn();
    if (settings.showTour) setRun({ kind: 'short', origin: 'monthly' });
    else if (seenVersion() < TOUR_VERSION) setOffer(true);
  }, [freshSignIn, settings, acknowledgeSignIn]);

  const start = useCallback(() => setRun({ kind: 'short', origin: tab }), [tab]);
  const startFull = useCallback(() => setRun({ kind: 'full', origin: tab }), [tab]);
  const startGuide = useCallback(() => setRun({ kind: 'guide', origin: tab }), [tab]);
  const dontShowAgain = settings?.showTour === false;

  const close = useCallback(
    (dontShowNow: boolean) => {
      const current = run as Run;
      setTab(current.origin);
      setRun(null);
      // A section's guide says nothing about the tour of the sign-in.
      if (current.kind === 'guide') return;
      markSeen();
      // Only an actual change of the preference is saved.
      if (dontShowNow !== dontShowAgain) {
        settingsContext!.updateSettings({ showTour: !dontShowNow }).catch(() => undefined);
      }
    },
    [run, setTab, dontShowAgain, settingsContext]
  );

  /** The notice: «see it» starts the tour from the first step; «not now» only hides it. */
  const answerOffer = useCallback((accepted: boolean) => {
    markSeen();
    setOffer(false);
    if (accepted) setRun({ kind: 'short', origin: 'monthly' });
  }, []);

  const premium = plan?.isPremium === true;
  const kind = run?.kind ?? null;
  const origin = run?.origin ?? null;
  const steps = useMemo(() => {
    if (kind === 'full') return tourSteps(premium);
    if (kind === 'guide') return sectionGuideSteps(origin as DashboardTab, premium);
    return shortTourSteps();
  }, [kind, origin, premium]);
  /** Whether the open section has its own guide (the «How does it work?» button). */
  const hasGuide = useMemo(() => sectionGuideSteps(tab, premium).length > 0, [tab, premium]);

  return {
    open: run !== null,
    kind,
    offer,
    answerOffer,
    start,
    startFull,
    startGuide,
    hasGuide,
    close,
    steps,
    dontShowAgain,
  };
}
