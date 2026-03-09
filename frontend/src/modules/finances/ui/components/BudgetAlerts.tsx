import { useState } from 'react';
import { useBudgetAlerts } from '../../application/hooks/useAlerts';
import type { BudgetAlert } from '../../application/hooks/useAlerts';
import { useI18n } from '@core/i18n/I18nContext';
import '../css/BudgetAlerts.css';
import type { BudgetAlertsProps } from '../types/BudgetAlerts.types';

function AlertCard({ alert, onDismiss }: { alert: BudgetAlert; onDismiss: () => void }) {
    const { t } = useI18n();
    const icon = alert.level === 'danger' ? '🔴' : '🟡';
    const progressWidth = Math.min(alert.percentage, 100);

    return (
        <div className={`alert-card alert-card--${alert.level}`} role="alert">
            <div className="alert-card-header">
                <span className="alert-card-icon">{icon}</span>
                <span className="alert-card-message">{alert.message}</span>
                <button
                    className="alert-card-dismiss"
                    onClick={onDismiss}
                    aria-label={t('app.alert.dismiss')}
                >✕</button>
            </div>
            <div className="alert-progress-bar">
                <div
                    className={`alert-progress-fill alert-progress-fill--${alert.level}`}
                    style={{ width: `${progressWidth}%` }}
                />
            </div>
            <div className="alert-card-amounts">
                <span>{t('app.alert.spent')} <strong>{alert.spentAmount.toFixed(2)}€</strong></span>
                {alert.remainingAmount !== null && (
                    <span>
                        {alert.remainingAmount >= 0
                            ? <>{t('app.alert.remaining')} <strong>{alert.remainingAmount.toFixed(2)}€</strong></>
                            : <>{t('app.alert.overBudget')} <strong>{Math.abs(alert.remainingAmount).toFixed(2)}€</strong></>
                        }
                    </span>
                )}
            </div>
        </div>
    );
}

export function BudgetAlerts({ summary, carryover }: BudgetAlertsProps) {
    const { t } = useI18n();
    const alerts = useBudgetAlerts({ summary, carryover, t });
    const [dismissed, setDismissed] = useState<Set<number>>(new Set());

    const visible = alerts.filter((_, i) => !dismissed.has(i));

    if (visible.length === 0) return null;

    return (
        <div className="budget-alerts">
            {visible.map((alert) => {
                const originalIdx = alerts.indexOf(alert);
                return (
                    <AlertCard
                        key={`${alert.category ?? 'global'}-${originalIdx}`}
                        alert={alert}
                        onDismiss={() => setDismissed(prev => new Set(prev).add(originalIdx))}
                    />
                );
            })}
        </div>
    );
}
