import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import type {
    CustomAlert,
    CreateCustomAlertDTO,
    UpdateCustomAlertDTO,
    CustomAlertMetric,
    CustomAlertOperator,
} from '@modules/finances/domain/types';

// ─── Evaluation types ─────────────────────────────────────────────────────────

export interface AlertEvalInput {
    totalExpenses: number;
    totalIncome: number;
    totalSaving: number;
    balance: number;
    carryover: number;
    expensesByCategory: Record<string, number>;
}

export interface TriggeredAlert {
    alert: CustomAlert;
    currentValue: number;
}

// ─── Pure evaluation function ─────────────────────────────────────────────────

type MetricComputer = (alert: CustomAlert, input: AlertEvalInput) => number | null;

const METRIC_COMPUTERS: Record<CustomAlertMetric, MetricComputer> = {
    expenses_pct: (_a, i) => {
        const available = i.carryover + i.totalIncome;
        return available > 0 ? (i.totalExpenses / available) * 100 : null;
    },
    income_pct: (_a, i) =>
        i.carryover > 0 ? (i.totalIncome / i.carryover) * 100 : null,
    saving_pct: (_a, i) =>
        i.totalIncome > 0 ? (i.totalSaving / i.totalIncome) * 100 : null,
    balance_pct: (_a, i) => {
        const available = i.carryover + i.totalIncome;
        return available > 0 ? (i.balance / available) * 100 : null;
    },
    balance_amount: (_a, i) => i.balance,
    category_pct: (a, i) => {
        const available = i.carryover + i.totalIncome;
        if (!a.category || available <= 0) return null;
        return ((i.expensesByCategory[a.category] ?? 0) / available) * 100;
    },
    category_amount: (a, i) => {
        if (!a.category) return null;
        return i.expensesByCategory[a.category] ?? 0;
    },
};

export function evaluateAlerts(
    alerts: CustomAlert[],
    input: AlertEvalInput,
): TriggeredAlert[] {
    return alerts.flatMap((alert) => {
        if (!alert.active) return [];
        const compute = METRIC_COMPUTERS[alert.metric as CustomAlertMetric];
        if (!compute) return [];
        const currentValue = compute(alert, input);
        if (currentValue === null) return [];
        const op = alert.operator as CustomAlertOperator;
        const isTriggered = op === 'gte' ? currentValue >= alert.threshold : currentValue <= alert.threshold;
        return isTriggered ? [{ alert, currentValue }] : [];
    });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCustomAlerts() {
    const { customAlertApi } = useApi();
    const { token } = useAuth();

    const [alerts, setAlerts] = useState<CustomAlert[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAlerts = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await customAlertApi.getAll();
            setAlerts(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al cargar alertas personalizadas');
        } finally {
            setLoading(false);
        }
    }, [token, customAlertApi]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    const createAlert = useCallback(async (dto: CreateCustomAlertDTO): Promise<CustomAlert> => {
        const alert = await customAlertApi.create(dto);
        setAlerts((prev) => [...prev, alert]);
        return alert;
    }, [customAlertApi]);

    const updateAlert = useCallback(async (id: string, dto: UpdateCustomAlertDTO): Promise<CustomAlert> => {
        const updated = await customAlertApi.update(id, dto);
        setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
        return updated;
    }, [customAlertApi]);

    const deleteAlert = useCallback(async (id: string): Promise<void> => {
        await customAlertApi.delete(id);
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, [customAlertApi]);

    const toggleActive = useCallback(async (id: string, active: boolean): Promise<void> => {
        await updateAlert(id, { active });
    }, [updateAlert]);

    return {
        alerts,
        loading,
        error,
        createAlert,
        updateAlert,
        deleteAlert,
        toggleActive,
        refresh: fetchAlerts,
    };
}
