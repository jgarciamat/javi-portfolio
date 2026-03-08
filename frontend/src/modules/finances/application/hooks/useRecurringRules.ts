import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import type { RecurringRule, CreateRecurringRuleDTO, UpdateRecurringRuleDTO } from '@modules/finances/domain/types';

export function useRecurringRules() {
    const { recurringApi } = useApi();
    const { token } = useAuth();

    const [rules, setRules] = useState<RecurringRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRules = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await recurringApi.getAll();
            setRules(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al cargar operaciones automáticas');
        } finally {
            setLoading(false);
        }
    }, [token, recurringApi]);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const createRule = useCallback(async (dto: CreateRecurringRuleDTO): Promise<RecurringRule> => {
        const rule = await recurringApi.create(dto);
        setRules((prev) => [...prev, rule]);
        return rule;
    }, [recurringApi]);

    const updateRule = useCallback(async (id: string, dto: UpdateRecurringRuleDTO): Promise<RecurringRule> => {
        const updated = await recurringApi.update(id, dto);
        setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
        return updated;
    }, [recurringApi]);

    const deleteRule = useCallback(async (id: string, scope: 'none' | 'from_current' | 'all' = 'none'): Promise<void> => {
        await recurringApi.delete(id, scope);
        setRules((prev) => prev.filter((r) => r.id !== id));
    }, [recurringApi]);

    const toggleActive = useCallback(async (id: string, active: boolean): Promise<void> => {
        await updateRule(id, { active });
    }, [updateRule]);

    return { rules, loading, error, createRule, updateRule, deleteRule, toggleActive, refresh: fetchRules };
}
