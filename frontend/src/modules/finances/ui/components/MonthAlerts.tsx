import { useState } from 'react';
import type { MonthAlert } from '@modules/finances/domain/types';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { monthAlertMessage } from './monthAlertMessage';
import '../css/BudgetAlerts.css';

interface MonthAlertsProps {
  alerts: MonthAlert[];
}

function alertKey(a: MonthAlert): string {
  return `${a.kind}-${a.categoryName ?? 'all'}-${a.level}`;
}

/** Alerts computed by the API: spending vs available money and category budgets. */
export function MonthAlerts({ alerts }: MonthAlertsProps) {
  const { t, tCategory } = useI18n();
  const { money } = useFormat();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = alerts.filter((a) => !dismissed.has(alertKey(a)));
  if (visible.length === 0) return null;

  return (
    <section className="budget-alerts" aria-label={t('app.alert.sectionLabel')} aria-live="polite">
      {visible.map((a) => {
        const remaining = a.limit - a.spent;
        const width = Math.round(Math.min(a.percentage, 100));
        return (
          <div key={alertKey(a)} className={`alert-card alert-card--${a.level}`} role="alert">
            <div className="alert-card-header">
              <span className="alert-card-icon">{a.level === 'danger' ? '🔴' : '🟡'}</span>
              <span className="alert-card-message">{monthAlertMessage(a, t, tCategory)}</span>
              <button
                className="alert-card-dismiss"
                onClick={() => setDismissed((prev) => new Set(prev).add(alertKey(a)))}
                aria-label={t('app.alert.dismiss')}
              >
                ✕
              </button>
            </div>
            <div
              className="alert-progress-bar"
              role="progressbar"
              aria-valuenow={width}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${width}%`}
            >
              <div
                className={`alert-progress-fill alert-progress-fill--${a.level}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <div className="alert-card-amounts">
              <span>
                {t('app.alert.spent')} <strong>{money(a.spent)}</strong>
              </span>
              <span>
                {remaining >= 0 ? t('app.alert.remaining') : t('app.alert.overBudget')}{' '}
                <strong>{money(Math.abs(remaining))}</strong>
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
