import { useState } from 'react';
import { MIN_YEAR, maxPeriod, type YearMonth } from '@modules/finances/domain/nextMonthLogic';

export interface TooltipState {
  text: string;
  color: string;
  x: number;
  y: number;
}

/** Year shown in the annual view (MIN_YEAR … year of the planning horizon) and its tooltip. */
export function useAnnualChart(initialYear: number, current: YearMonth) {
  const lastYear = maxPeriod(current).year;
  const [year, setYear] = useState(initialYear);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  return {
    year,
    tooltip,
    showTooltip: (e: { clientX: number; clientY: number }, text: string, color: string) =>
      setTooltip({ text, color, x: e.clientX, y: e.clientY }),
    hideTooltip: () => setTooltip(null),
    prevYear: () => setYear((y) => Math.max(MIN_YEAR, y - 1)),
    nextYear: () => setYear((y) => Math.min(lastYear, y + 1)),
    prevYearDisabled: year <= MIN_YEAR,
    nextYearDisabled: year >= lastYear,
  };
}
