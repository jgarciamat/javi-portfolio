import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { useAuth } from '@shared/hooks/useAuth';
import { tourSteps } from '../../ui/tour/tourSteps';
import type { DashboardTab } from '../../ui/navigation';

/**
 * The guided tour: opens after every sign-in until the user ticks "don't show
 * again" (saved in the account, so it applies on every device), and on demand
 * from Settings. When it ends, the user is back where it started.
 */
export function useWelcomeTour(tab: DashboardTab, setTab: (tab: DashboardTab) => void) {
  const { freshSignIn, acknowledgeSignIn } = useAuth();
  const settingsContext = useOptionalSettings();
  const settings = settingsContext?.settings ?? null;
  /** Section to return to when the tour ends; null while it is closed. */
  const [origin, setOrigin] = useState<DashboardTab | null>(null);

  useEffect(() => {
    if (!freshSignIn || !settings) return;
    acknowledgeSignIn();
    if (settings.showTour) setOrigin('monthly');
  }, [freshSignIn, settings, acknowledgeSignIn]);

  const start = useCallback(() => setOrigin(tab), [tab]);
  const dontShowAgain = settings?.showTour === false;

  const close = useCallback(
    (dontShowNow: boolean) => {
      setTab(origin as DashboardTab);
      setOrigin(null);
      // Only an actual change of the preference is saved.
      if (dontShowNow !== dontShowAgain) {
        settingsContext!.updateSettings({ showTour: !dontShowNow }).catch(() => undefined);
      }
    },
    [origin, setTab, dontShowAgain, settingsContext]
  );

  const steps = useMemo(() => tourSteps(settings?.showOffers !== false), [settings?.showOffers]);

  return {
    open: origin !== null,
    start,
    close,
    steps,
    dontShowAgain,
  };
}
