import { useEffect } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import {
  cancelBillReminders,
  hasNotificationPermission,
  scheduleBillReminders,
} from '@core/notifications/notifications';
import { isNativeApp } from '@shared/utils/platform';
import { upcomingBills } from '../../domain/billReminders';

/**
 * Android app: when notifications are on, the phone reminds the user the morning before a
 * period charges the automatic expenses. Re-planned every time the app opens, so changes to
 * the rules are picked up.
 */
export function useBillReminders(
  enabled: boolean,
  current: { year: number; month: number; start: string } | null
): void {
  const { recurringApi } = useApi();
  const { t } = useI18n();
  const { money } = useFormat();
  const year = current?.year;
  const month = current?.month;
  const start = current?.start;

  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    void (async () => {
      if (!enabled || year === undefined || !(await hasNotificationPermission())) {
        await cancelBillReminders();
        return;
      }
      const rules = await recurringApi.getAll();
      if (cancelled) return;
      const reminders = upcomingBills(
        rules,
        { year, month: month as number, start: start as string },
        new Date()
      ).map((r) => ({
        at: r.at,
        title: t('app.notifications.billsTitle'),
        body: t('app.notifications.billsBody', { count: r.count, total: money(r.total) }),
      }));
      await scheduleBillReminders(reminders);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // The texts only matter when the plan is made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, year, month, start, recurringApi]);
}
