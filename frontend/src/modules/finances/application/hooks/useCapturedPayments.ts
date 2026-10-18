import { useCallback, useEffect, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { captureSupported, drainCaptured } from '@core/capture/notificationCapture';
import { errorMessage } from '@shared/utils/errors';
import { useFinances } from '../FinancesContext';
import { parseBankNotification, type DetectedPayment } from '../../domain/bankNotifications';
import { addPending, captureEnabled, loadPending, removePending } from '../capturedPayments';

/** Payments detected in bank notifications, waiting for the person to add or ignore them. */
export function useCapturedPayments() {
  const { transactionApi } = useApi();
  const { refresh } = useFinances();
  const [pending, setPending] = useState<DetectedPayment[]>(loadPending);
  const [error, setError] = useState<string | null>(null);

  const collect = useCallback(async () => {
    if (!captureSupported() || !captureEnabled()) return;
    try {
      const notifications = await drainCaptured();
      const payments = notifications
        .map((n) => parseBankNotification(n.title, n.text, n.postedAt))
        .filter((p): p is DetectedPayment => p !== null);
      setPending(addPending(payments));
    } catch {
      /* the service is not available: nothing to collect now */
    }
  }, []);

  useEffect(() => {
    void collect();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void collect();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [collect]);

  const add = async (items: DetectedPayment[]) => {
    setError(null);
    try {
      await transactionApi.import(
        items.map((p) => ({
          date: p.date,
          description: p.description,
          amount: p.type === 'INCOME' ? p.amount : -p.amount,
          type: p.type,
          notes: 'Detectado en una notificación',
        })),
        { source: 'capture' }
      );
      setPending(removePending(items.map((p) => p.id)));
      await refresh({ invalidate: true });
    } catch (e) {
      setError(errorMessage(e, 'Error'));
    }
  };

  const ignore = (items: DetectedPayment[]) => setPending(removePending(items.map((p) => p.id)));

  return { pending, error, add, ignore, collect };
}
