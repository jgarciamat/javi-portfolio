import { useEffect, useRef } from 'react';
import type { MonthAlert } from '@modules/finances/domain/types';
import {
  hasNotificationPermission,
  notificationId,
  showNotification,
} from '@core/notifications/notifications';
import { storage } from '@shared/utils/storage';

const STORAGE_KEY = 'mm_notified_alerts';
/** Remembered keys (older ones are dropped). */
const MEMORY = 200;

export const alertNotificationKey = (year: number, month: number, alert: MonthAlert): string =>
  `${year}-${month}-${alert.kind}-${alert.categoryName ?? 'all'}-${alert.level}`;

/**
 * Notifies each new budget alert of the current period once (per level), when
 * the user enabled notifications in Settings.
 */
export function useAlertNotifications(params: {
  enabled: boolean;
  isCurrentPeriod: boolean;
  year: number;
  month: number;
  alerts: MonthAlert[];
  message: (alert: MonthAlert) => string;
  title: string;
}): void {
  const { enabled, isCurrentPeriod, year, month, alerts } = params;
  // Text depends on the language; changing it must not notify again.
  const latest = useRef(params);
  latest.current = params;

  useEffect(() => {
    if (!enabled || !isCurrentPeriod || alerts.length === 0) return;
    let cancelled = false;
    (async () => {
      if (!(await hasNotificationPermission()) || cancelled) return;
      const notified = new Set(storage.getJSON<string[]>(STORAGE_KEY, []));
      for (const alert of alerts) {
        const key = alertNotificationKey(year, month, alert);
        if (notified.has(key)) continue;
        notified.add(key);
        const { title, message } = latest.current;
        await showNotification(notificationId(key), title, message(alert));
      }
      storage.setJSON(STORAGE_KEY, [...notified].slice(-MEMORY));
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, isCurrentPeriod, year, month, alerts]);
}
