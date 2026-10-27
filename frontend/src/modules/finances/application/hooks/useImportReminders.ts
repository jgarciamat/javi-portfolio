import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import {
  cancelMonthlyReminder,
  hasNotificationPermission,
  onNotificationTap,
  scheduleMonthlyReminders,
} from '@core/notifications/notifications';
import { isNativeApp } from '@shared/utils/platform';
import { endedMonthOf, nextMonthStarts } from '../../domain/importReminders';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** The texts of the next monthly reminders: «Ya tienes el extracto de octubre, son 30 segundos». */
export function importReminders(
  startDay: number,
  t: Translate,
  locale: string,
  now = new Date()
): { at: Date; title: string; body: string }[] {
  const month = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'es-ES', { month: 'long' });
  return nextMonthStarts(now, startDay).map((at) => ({
    at,
    title: t('app.notifications.statementTitle', { month: month.format(endedMonthOf(at)) }),
    body: t('app.notifications.statementBody'),
  }));
}

/**
 * Android app: with notifications on, the phone reminds the person each month that the statement
 * of the month just ended can be imported (re-planned every time the app opens, so each one says
 * its month). A tap on it opens the importer. Notifications off: no reminders.
 */
export function useImportReminders(enabled: boolean, startDay: number | null): void {
  const { t, locale } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeApp()) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    void onNotificationTap((url) => navigate(url)).then((remove) => {
      if (cancelled) remove();
      else stop = remove;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [navigate]);

  useEffect(() => {
    if (!isNativeApp()) return;
    void (async () => {
      if (!enabled || startDay === null || !(await hasNotificationPermission())) {
        await cancelMonthlyReminder();
        return;
      }
      await scheduleMonthlyReminders(importReminders(startDay, t, locale));
    })().catch(() => undefined);
    // The texts only matter when the plan is made (a language change re-plans it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, startDay, locale]);
}
