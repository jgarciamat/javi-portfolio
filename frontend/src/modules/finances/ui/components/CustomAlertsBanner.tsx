import { useMemo, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type { FinancialSummary } from '@modules/finances/domain/types';
import {
  alertInput,
  evaluateAlerts,
  metricMeta,
  type TriggeredAlert,
} from '@modules/finances/domain/customAlerts';
import { useCustomAlerts } from '../../application/CustomAlertsContext';
import { formatMetricValue } from './alertFormat';
import '../css/BudgetAlerts.css';

function BannerCard({
  triggered,
  onDismiss,
}: {
  triggered: TriggeredAlert;
  onDismiss: () => void;
}) {
  const { t, tCategory } = useI18n();
  const format = useFormat();
  const { alert, currentValue } = triggered;
  const meta = metricMeta(alert.metric);
  const color = alert.color || '#6366f1';
  const progress =
    meta.unit === 'percent'
      ? Math.min((currentValue / Math.max(alert.threshold, 1)) * 100, 100)
      : null;
  const message = t(`${meta.bannerKey}.${alert.operator}`, {
    name: alert.name,
    threshold: formatMetricValue(format, meta.unit, alert.threshold),
    category: alert.category ? tCategory(alert.category) : '',
  });

  return (
    <div
      className="alert-card"
      role="alert"
      style={{ background: `${color}22`, borderColor: `${color}88` }}
    >
      <div className="alert-card-header">
        <span className="alert-card-icon">🔔</span>
        <span className="alert-card-message">{message}</span>
        <button
          className="alert-card-dismiss"
          onClick={onDismiss}
          aria-label={t('app.alert.dismiss')}
        >
          ✕
        </button>
      </div>
      {progress !== null && (
        <div
          className="alert-progress-bar"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${Math.round(progress)}%`}
        >
          <div
            className="alert-progress-fill"
            style={{ width: `${progress}%`, background: color }}
          />
        </div>
      )}
      <div className="alert-card-amounts">
        <span>
          {t('app.customAlerts.currentValue')}:{' '}
          <strong>{formatMetricValue(format, meta.unit, currentValue)}</strong>
        </span>
      </div>
    </div>
  );
}

interface CustomAlertsBannerProps {
  summary: FinancialSummary | null;
  carryover: number | null;
}

/** Custom alerts that fire for the viewed month; each one can be dismissed. */
export function CustomAlertsBanner({ summary, carryover }: CustomAlertsBannerProps) {
  const { alerts } = useCustomAlerts();
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const triggered = useMemo(
    () => evaluateAlerts(alerts, alertInput(summary, carryover)),
    [alerts, summary, carryover]
  );
  const visible = triggered.filter((tr) => !dismissed.has(tr.alert.id));
  if (visible.length === 0) return null;

  return (
    <section className="budget-alerts" aria-live="polite">
      {visible.map((tr) => (
        <BannerCard
          key={tr.alert.id}
          triggered={tr}
          onDismiss={() => setDismissed((prev) => new Set(prev).add(tr.alert.id))}
        />
      ))}
    </section>
  );
}
