import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import type { AnnualSummary } from '@modules/finances/domain/types';

export function useAnnualSummary(year: number) {
    const { transactionApi } = useApi();
    const { token } = useAuth();
    const [data, setData] = useState<AnnualSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const result = await transactionApi.getAnnual(year);
            setData(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al cargar resumen anual');
        } finally {
            setLoading(false);
        }
    }, [year, token, transactionApi]);

    useEffect(() => { fetch(); }, [fetch]);

    return { data, loading, error, refresh: fetch };
}
