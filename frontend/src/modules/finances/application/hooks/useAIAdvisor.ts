import { useState, useCallback, useEffect, useRef } from 'react';
import { aiApi, AIAdvice } from '@core/api/premiumApi';

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

/** Read the logged-in user's id from localStorage (set by AuthProvider). */
function getCurrentUserId(): string {
    try {
        const raw = localStorage.getItem('mm_user');
        if (!raw) return 'anonymous';
        const parsed = JSON.parse(raw) as { id?: string };
        return parsed.id ?? 'anonymous';
    } catch {
        return 'anonymous';
    }
}

function storageKey(userId: string, year: number, month: number) {
    return `ai_advice_${userId}_${year}_${month}`;
}

interface Persisted {
    advice: AIAdvice;
    analyzedAt: string; // ISO timestamp
}

function loadFromStorage(userId: string, year: number, month: number): Persisted | null {
    try {
        const raw = localStorage.getItem(storageKey(userId, year, month));
        return raw ? (JSON.parse(raw) as Persisted) : null;
    } catch {
        return null;
    }
}

function saveToStorage(userId: string, year: number, month: number, advice: AIAdvice) {
    const data: Persisted = { advice, analyzedAt: new Date().toISOString() };
    localStorage.setItem(storageKey(userId, year, month), JSON.stringify(data));
}

/** Returns full days remaining until the cooldown expires (0 = can analyse now). */
function daysRemaining(analyzedAt: string): number {
    const elapsed = Date.now() - new Date(analyzedAt).getTime();
    const remaining = COOLDOWN_MS - elapsed;
    return remaining > 0 ? Math.ceil(remaining / (24 * 60 * 60 * 1000)) : 0;
}

interface UseAIAdvisorResult {
    advice: AIAdvice | null;
    loading: boolean;
    error: string | null;
    /** True when on cooldown (cannot analyse again yet). */
    analyzed: boolean;
    /** Days left in the cooldown; 0 means analysis is available. */
    daysUntilNextAnalysis: number;
    /** True only for the render cycle immediately after a fresh analysis completes. */
    justAnalyzed: boolean;
    analyze: (year: number, month: number) => Promise<void>;
}

interface Options {
    year: number;
    month: number;
}

export function useAIAdvisor({ year, month }: Options): UseAIAdvisorResult {
    const userId = getCurrentUserId();
    const persisted = loadFromStorage(userId, year, month);

    const [advice, setAdvice] = useState<AIAdvice | null>(persisted?.advice ?? null);
    const [analyzedAt, setAnalyzedAt] = useState<string | null>(persisted?.analyzedAt ?? null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Tracks whether the last state change was a fresh analysis (vs re-hydration)
    const [justAnalyzed, setJustAnalyzed] = useState(false);

    // Re-hydrate when year/month change — this is NOT a fresh analysis
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const p = loadFromStorage(userId, year, month);
        setAdvice(p?.advice ?? null);
        setAnalyzedAt(p?.analyzedAt ?? null);
        setError(null);
        setJustAnalyzed(false);
    }, [year, month, userId]);

    const days = analyzedAt ? daysRemaining(analyzedAt) : 0;
    const analyzed = days > 0;

    const analyze = useCallback(async (y: number, m: number) => {
        const uid = getCurrentUserId();
        setLoading(true);
        setError(null);
        setJustAnalyzed(false);
        try {
            const result = await aiApi.getAdvice(y, m);
            setAdvice(result);
            const now = new Date().toISOString();
            setAnalyzedAt(now);
            saveToStorage(uid, y, m, result);
            setJustAnalyzed(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al analizar');
        } finally {
            setLoading(false);
        }
    }, []);

    return { advice, loading, error, analyzed, daysUntilNextAnalysis: days, justAnalyzed, analyze };
}
