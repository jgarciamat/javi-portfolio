import { useState, useCallback } from 'react';
import { aiApi, AIAdvice } from '@core/api/premiumApi';

interface UseAIAdvisorResult {
    advice: AIAdvice | null;
    loading: boolean;
    error: string | null;
    analyze: (year: number, month: number) => Promise<void>;
    clear: () => void;
}

export function useAIAdvisor(): UseAIAdvisorResult {
    const [advice, setAdvice] = useState<AIAdvice | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyze = useCallback(async (year: number, month: number) => {
        setLoading(true);
        setError(null);
        try {
            const result = await aiApi.getAdvice(year, month);
            setAdvice(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al analizar');
        } finally {
            setLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setAdvice(null);
        setError(null);
    }, []);

    return { advice, loading, error, analyze, clear };
}
