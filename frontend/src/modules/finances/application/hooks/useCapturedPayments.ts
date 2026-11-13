import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { captureSupported, drainCaptured, reportWaiting } from '@core/capture/notificationCapture';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { errorMessage } from '@shared/utils/errors';
import { useFinances } from '../FinancesContext';
import { parseBankNotification, type DetectedPayment } from '../../domain/bankNotifications';
import type { Suggestion } from '../../domain/reviewLearning';
import {
  addPending,
  captureEnabled,
  loadPending,
  removePending,
  restorePending,
  syncCapture,
} from '../capturedPayments';

/** Suggested category of each payment waiting, and whether it is already among the movements. */
export type ReviewSuggestion = Suggestion & { duplicate: boolean };

const NOTE = 'Detectado en una notificación';

const rowOf = (p: DetectedPayment, category?: string) => ({
  date: p.date,
  description: p.description,
  amount: p.type === 'INCOME' ? p.amount : -p.amount,
  type: p.type,
  notes: NOTE,
  ...(category && { category }),
});

/**
 * Payments detected in bank notifications, waiting in «Para revisar» for the person to add or
 * discard them. Each one comes with the category the import would give it (rules, history,
 * keywords): a preview of the same import that adds it, which costs nothing on any plan.
 */
export function useCapturedPayments() {
  const { transactionApi } = useApi();
  const { t } = useI18n();
  const { refresh } = useFinances();
  const plan = useOptionalPlan();
  const [pending, setPending] = useState<DetectedPayment[]>(loadPending);
  const [suggestions, setSuggestions] = useState<Record<string, ReviewSuggestion>>({});
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(new Set<string>());

  const collect = useCallback(async () => {
    if (!captureSupported() || !captureEnabled()) return;
    try {
      const notifications = await drainCaptured();
      const payments = notifications
        .map((n) => parseBankNotification(n.title, n.text, n.postedAt, n.packageName))
        .filter((p): p is DetectedPayment => p !== null);
      setPending(addPending(payments));
    } catch {
      /* the service is not available: nothing to collect now */
    }
  }, []);

  useEffect(() => {
    if (captureSupported()) void syncCapture(t);
    void collect();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void collect();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // The texts of the alerts only matter when the service is configured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collect]);

  // The phone's reminder only makes sense while something waits.
  useEffect(() => {
    if (captureSupported()) void reportWaiting(pending.length).catch(() => undefined);
  }, [pending.length]);

  useEffect(() => {
    const unasked = pending.filter((p) => !asked.current.has(p.id));
    if (unasked.length === 0) return;
    unasked.forEach((p) => asked.current.add(p.id));
    void transactionApi
      .import(
        unasked.map((p) => rowOf(p)),
        { source: 'capture', dryRun: true }
      )
      .then((result) => {
        const found: Record<string, ReviewSuggestion> = {};
        for (const row of result.rows) {
          const payment = unasked[row.index];
          if (row.categoryName) {
            found[payment.id] = {
              category: row.categoryName,
              source: row.categorySource,
              duplicate: false,
            };
          } else if (row.status === 'duplicate') {
            found[payment.id] = { category: '', duplicate: true };
          }
        }
        setSuggestions((s) => ({ ...s, ...found }));
      })
      .catch(() => {
        /* without a suggestion the import still picks the category when it is added */
      });
  }, [pending, transactionApi]);

  /** Adds them with the category chosen for each one (else the one the import picks). */
  const add = async (items: DetectedPayment[], chosen: Record<string, string>) => {
    setError(null);
    try {
      await transactionApi.import(
        items.map((p) => rowOf(p, chosen[p.id] ?? suggestions[p.id]?.category)),
        { source: 'capture' }
      );
      setPending(removePending(items.map((p) => p.id)));
      await Promise.all([refresh({ invalidate: true }), plan?.refresh()]);
      return true;
    } catch (e) {
      setError(errorMessage(e, 'Error'));
      return false;
    }
  };

  const ignore = (items: DetectedPayment[]) => setPending(removePending(items.map((p) => p.id)));

  const restore = (item: DetectedPayment, index: number) => setPending(restorePending(item, index));

  return { pending, suggestions, error, add, ignore, restore, collect };
}
