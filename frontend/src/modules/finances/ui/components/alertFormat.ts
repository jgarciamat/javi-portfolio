import type { Formatter } from '@core/settings/SettingsContext';
import type { MetricUnit } from '@modules/finances/domain/customAlerts';

/** "80 %" or "1.234,50 €" in the user's language and currency. */
export function formatMetricValue(format: Formatter, unit: MetricUnit, value: number): string {
  if (unit === 'money') return format.money(value);
  return format.percent(value, Number.isInteger(value) ? 0 : 1);
}
