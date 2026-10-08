import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UserSettings } from '@modules/finances/domain/types';
import {
  MAX_MONTHS_AHEAD,
  MIN_YEAR,
  addMonths,
  comparePeriods,
  isNextButtonDisabled,
  isPrevButtonDisabled,
  type YearMonth,
} from '@modules/finances/domain/nextMonthLogic';

const calendarNow = (): YearMonth => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

/**
 * Which month is on screen. Starts at the current period (which depends on the
 * user's month start day), can go back to MIN_YEAR and forward up to the
 * planning horizon.
 */
export function useMonthNavigation(settings: UserSettings | null) {
  const currentYear = settings?.currentPeriod.year ?? calendarNow().year;
  const currentMonth = settings?.currentPeriod.month ?? calendarNow().month;
  const currentPeriod = useMemo(
    () => ({ year: currentYear, month: currentMonth }),
    [currentYear, currentMonth]
  );
  const [view, setView] = useState<YearMonth>(currentPeriod);

  // When the settings arrive (or the start day changes), jump to the real current period once.
  const syncedPeriod = useRef<string | null>(null);
  const syncKey = settings ? `${currentYear}-${currentMonth}-${settings.monthStartDay}` : null;
  useEffect(() => {
    if (!syncKey || syncedPeriod.current === syncKey) return;
    syncedPeriod.current = syncKey;
    setView(currentPeriod);
  }, [syncKey, currentPeriod]);

  const isPrevDisabled = isPrevButtonDisabled(view.year, view.month);
  const isNextDisabled = isNextButtonDisabled(view.year, view.month, currentPeriod);

  const navigateTo = useCallback(
    (year: number, month: number) => {
      const horizon = addMonths(currentPeriod, MAX_MONTHS_AHEAD);
      if (year < MIN_YEAR || comparePeriods({ year, month }, horizon) > 0) return;
      setView({ year, month });
    },
    [currentPeriod]
  );

  const goToPrev = useCallback(() => {
    if (!isPrevDisabled) setView((v) => addMonths(v, -1));
  }, [isPrevDisabled]);

  const goToNext = useCallback(() => {
    if (!isNextDisabled) setView((v) => addMonths(v, 1));
  }, [isNextDisabled]);

  const goToCurrent = useCallback(() => setView(currentPeriod), [currentPeriod]);

  return useMemo(
    () => ({
      year: view.year,
      month: view.month,
      currentPeriod,
      isCurrentPeriod: comparePeriods(view, currentPeriod) === 0,
      isPrevDisabled,
      isNextDisabled,
      navigateTo,
      goToPrev,
      goToNext,
      goToCurrent,
    }),
    [
      view,
      currentPeriod,
      isPrevDisabled,
      isNextDisabled,
      navigateTo,
      goToPrev,
      goToNext,
      goToCurrent,
    ]
  );
}
