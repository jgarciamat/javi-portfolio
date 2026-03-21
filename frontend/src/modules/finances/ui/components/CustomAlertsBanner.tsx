import React, { useState } from 'react';
import { useCustomAlerts, evaluateAlerts } from '../../application/hooks/useCustomAlerts';
import type { AlertEvalInput, TriggeredAlert } from '../../application/hooks/useCustomAlerts';
import { useI18n } from '@core/i18n/I18nContext';
import type { FinancialSummary } from '@modules/finances/domain/types';
import '../css/BudgetAlerts.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEvalInput(
    summary: FinancialSummary | null,
    carryover: number | null,
): AlertEvalInput {
    return {
        totalExpenses: summary?.totalExpenses ?? 0,
        totalIncome: summary?.totalIncome ?? 0,
        totalSaving: summary?.totalSaving ?? 0,
        balance: summary?.balance ?? 0,
        carryover: carryover ?? 0,
        expensesByCategory: summary?.expensesByCategory ?? {},
    };
}

function isPercentMetric(metric: string): boolean {
    return metric.endsWith('_pct');
}

function formatThreshold(value: number, metric: string): string {
    if (isPercentMetric(metric)) return `${value}%`;
    return `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function formatCurrentValue(value: number, metric: string): string {
    if (isPercentMetric(metric)) return `${value.toFixed(1)}%`;
    return `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

// Mapa métrica → clave de traducción del banner
const BANNER_KEYS: Record<string, string> = {
    category_pct: 'app.customAlerts.banner.categoryPct',
    category_amount: 'app.customAlerts.banner.categoryAmount',
    expenses_pct: 'app.customAlerts.banner.expensesPct',
    saving_pct: 'app.customAlerts.banner.savingPct',
    balance_pct: 'app.customAlerts.banner.balancePct',
    balance_amount: 'app.customAlerts.banner.balanceAmount',
    income_pct: 'app.customAlerts.banner.incomePct',
};

function buildMessage(ta: TriggeredAlert, t: (k: string, v?: Record<string, string>) => string): string {
    const { alert } = ta;
    const baseKey = BANNER_KEYS[alert.metric] ?? 'app.customAlerts.banner.expensesPct';
    const key = `${baseKey}.${alert.operator}`;
    const threshold = formatThreshold(alert.threshold, alert.metric);
    return t(key, {
        name: alert.name,
        threshold,
        category: alert.category ?? '',
    });
}

// ─── Single banner card ───────────────────────────────────────────────────────

interface BannerCardProps {
    ta: TriggeredAlert;
    onDismiss: () => void;
}

function BannerCard({ ta, onDismiss }: BannerCardProps) {
    const { t } = useI18n();
    const { alert, currentValue } = ta;
    const isPct = isPercentMetric(alert.metric);
    const color = alert.color ?? '#6366f1';

    // Para métricas de porcentaje mostramos la barra relativa al threshold
    const progressWidth = isPct
        ? Math.min((currentValue / Math.max(alert.threshold, 1)) * 100, 100)
        : null;

    const message = buildMessage(ta, t);

    // Derive a semi-transparent bg from the alert color
    const cardStyle: React.CSSProperties = {
        background: `${color}22`,
        borderColor: `${color}88`,
    };

    return (
        <div className="alert-card" role="alert" style={cardStyle}>
            <div className="alert-card-header">
                <span className="alert-card-icon">🔔</span>
                <span className="alert-card-message">{message}</span>
                <button
                    className="alert-card-dismiss"
                    onClick={onDismiss}
                    aria-label={t('app.alert.dismiss')}
                >✕</button>
            </div>

            {progressWidth !== null && (
                <div
                    className="alert-progress-bar"
                    role="progressbar"
                    aria-valuenow={progressWidth}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${progressWidth.toFixed(0)}%`}
                >
                    <div
                        className="alert-progress-fill"
                        style={{ width: `${progressWidth}%`, background: color }}
                    />
                </div>
            )}

            <div className="alert-card-amounts">
                <span>
                    {t('app.customAlerts.currentValue')}:{' '}
                    <strong>{formatCurrentValue(currentValue, alert.metric)}</strong>
                </span>
            </div>
        </div>
    );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface CustomAlertsBannerProps {
    summary: FinancialSummary | null;
    carryover: number | null;
}

export function CustomAlertsBanner({ summary, carryover }: CustomAlertsBannerProps) {
    const { alerts } = useCustomAlerts();
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const evalInput = buildEvalInput(summary, carryover);
    const triggered = evaluateAlerts(alerts, evalInput);
    const visible = triggered.filter((ta) => !dismissed.has(ta.alert.id));

    if (visible.length === 0) return null;

    return (
        <section className="budget-alerts" aria-live="polite">
            {visible.map((ta) => (
                <BannerCard
                    key={ta.alert.id}
                    ta={ta}
                    onDismiss={() => setDismissed((prev) => new Set(prev).add(ta.alert.id))}
                />
            ))}
        </section>
    );
}
