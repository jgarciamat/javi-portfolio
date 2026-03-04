import { useState } from 'react';
import { useBudgetAlerts } from '../../application/hooks/useAlerts';
import type { BudgetAlert } from '../../application/hooks/useAlerts';
import type { FinancialSummary } from '@modules/finances/domain/types';
import '../css/BudgetAlerts.css';

interface Props {
    summary: FinancialSummary | null;
    carryover: number | null;
}

function AlertCard({ alert, onDismiss }: { alert: BudgetAlert; onDismiss: () => void }) {
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
                    aria-label="Cerrar alerta"
                >✕</button>
            </div>
            <div className="alert-progress-bar">
                <div
                    className={`alert-progress-fill alert-progress-fill--${alert.level}`}
                    style={{ width: `${progressWidth}%` }}
                />
            </div>
            <div className="alert-card-amounts">
                <span>Gastado: <strong>{alert.spentAmount.toFixed(2)}€</strong></span>
                {alert.remainingAmount !== null && (
                    <span>
                        {alert.remainingAmount >= 0
                            ? <>Te quedan: <strong>{alert.remainingAmount.toFixed(2)}€</strong></>
                            : <>Te pasas: <strong>{Math.abs(alert.remainingAmount).toFixed(2)}€</strong></>
                        }
                    </span>
                )}
            </div>
        </div>
    );
}

export function BudgetAlerts({ summary, carryover }: Props) {
    const alerts = useBudgetAlerts({ summary, carryover });
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
