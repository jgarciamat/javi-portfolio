import type { MonthAlert } from '@modules/finances/domain/types';

type T = (key: string, vars?: Record<string, string | number>) => string;

/** "Has gastado el 85 % del dinero disponible" / "… del presupuesto de Ocio". */
export function monthAlertMessage(alert: MonthAlert, t: T, tCategory: (name: string) => string) {
  const pct = Math.round(alert.percentage);
  const danger = alert.level === 'danger';
  if (alert.kind === 'available') {
    return t(danger ? 'app.alert.globalDanger' : 'app.alert.globalWarning', { pct });
  }
  return t(danger ? 'app.alert.budgetDanger' : 'app.alert.budgetWarning', {
    category: tCategory(alert.categoryName ?? ''),
    pct,
  });
}
