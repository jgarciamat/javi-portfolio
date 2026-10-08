import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import { errorMessage } from '@shared/utils/errors';
import { storage } from '@shared/utils/storage';
import type { AIAdvice } from '@modules/finances/domain/types';

const storageKey = (userId: string, year: number, month: number) =>
  `ai_advice_${userId}_${year}_${month}`;

/** The last analysis of each month is kept on the device so it is visible after a reload. */
function loadAdvice(userId: string, year: number, month: number): AIAdvice | null {
  const saved = storage.getJSON<{ advice?: AIAdvice } | null>(
    storageKey(userId, year, month),
    null
  );
  return saved?.advice ?? null;
}

interface Options {
  year: number;
  month: number;
  locale: string;
}

/**
 * Asks the API for the analysis of a month. The limits live in the server
 * (Premium, monthly quota, daily budget, cache), so analysing again is always allowed.
 */
export function useAIAdvisor({ year, month, locale }: Options) {
  const { insightsApi } = useApi();
  const userId = useAuth().user?.id ?? 'anonymous';
  const [advice, setAdvice] = useState<AIAdvice | null>(() => loadAdvice(userId, year, month));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** True only after a fresh analysis (not after re-reading a saved one). */
  const [justAnalyzed, setJustAnalyzed] = useState(false);
  const localeRef = useRef(locale);
  localeRef.current = locale;

  // Another month (or user): show what was saved for it.
  const shown = useRef(`${userId}-${year}-${month}`);
  useEffect(() => {
    const key = `${userId}-${year}-${month}`;
    if (shown.current === key) return;
    shown.current = key;
    setAdvice(loadAdvice(userId, year, month));
    setError(null);
    setJustAnalyzed(false);
  }, [userId, year, month]);

  const analyze = useCallback(
    async (y: number, m: number) => {
      setLoading(true);
      setError(null);
      setJustAnalyzed(false);
      try {
        const result = await insightsApi.advice(y, m, localeRef.current);
        setAdvice(result);
        storage.setJSON(storageKey(userId, y, m), { advice: result });
        setJustAnalyzed(true);
      } catch (e) {
        setError(errorMessage(e, 'Error'));
      } finally {
        setLoading(false);
      }
    },
    [insightsApi, userId]
  );

  return { advice, loading, error, justAnalyzed, analyze };
}
