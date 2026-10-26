import { isNativeApp } from '@shared/utils/platform';

/**
 * Local notifications: native (Android/iOS via @capacitor/local-notifications)
 * or the browser Notification API. They are generated on the device; there is
 * no push server involved.
 */

/** Ids of the monthly reminders to import the statement (one per coming month). */
const MONTHLY_REMINDER_IDS = [1001, 1002, 1003];
/** Where a tap on a monthly reminder takes the person: the importer. */
export const IMPORT_URL = '/?importar=1';
/** Ids of the scheduled "bills tomorrow" reminders (one per upcoming period). */
const BILL_REMINDER_IDS = [1011, 1012, 1013];

async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return LocalNotifications;
}

export function notificationsSupported(): boolean {
  return isNativeApp() || (typeof window !== 'undefined' && 'Notification' in window);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativeApp()) {
    const p = await plugin();
    const status = await p.requestPermissions();
    return status.display === 'granted';
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (isNativeApp()) {
    const p = await plugin();
    return (await p.checkPermissions()).display === 'granted';
  }
  return 'Notification' in window && Notification.permission === 'granted';
}

export async function showNotification(id: number, title: string, body: string): Promise<void> {
  if (isNativeApp()) {
    const p = await plugin();
    await p.schedule({ notifications: [{ id, title, body }] });
    return;
  }
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker?.getRegistration?.();
  if (registration)
    await registration.showNotification(title, { body, tag: String(id), icon: '/icon-192.png' });
  else new Notification(title, { body, tag: String(id) });
}

/**
 * Native only: replaces the monthly reminders with these (the statement of the month just ended,
 * at most three, each with its month's name). A tap opens the importer.
 */
export async function scheduleMonthlyReminders(
  reminders: { at: Date; title: string; body: string }[]
): Promise<void> {
  if (!isNativeApp()) return;
  const p = await plugin();
  await p.cancel({ notifications: MONTHLY_REMINDER_IDS.map((id) => ({ id })) });
  if (reminders.length === 0) return;
  await p.schedule({
    notifications: reminders.slice(0, MONTHLY_REMINDER_IDS.length).map((r, i) => ({
      id: MONTHLY_REMINDER_IDS[i],
      title: r.title,
      body: r.body,
      schedule: { at: r.at, allowWhileIdle: true },
      extra: { url: IMPORT_URL },
    })),
  });
}

/** Native only: a tap on a notification that carries an address opens it in the app. */
export async function onNotificationTap(open: (url: string) => void): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  const p = await plugin();
  const handle = await p.addListener('localNotificationActionPerformed', (action) => {
    const url: unknown = action.notification.extra?.url;
    if (typeof url === 'string' && url.startsWith('/')) open(url);
  });
  return () => void handle.remove();
}

/** Native only: replaces the "bills tomorrow" reminders with these (nothing in the past). */
export async function scheduleBillReminders(
  reminders: { at: Date; title: string; body: string }[]
): Promise<void> {
  if (!isNativeApp()) return;
  const p = await plugin();
  await p.cancel({ notifications: BILL_REMINDER_IDS.map((id) => ({ id })) });
  if (reminders.length === 0) return;
  await p.schedule({
    notifications: reminders.slice(0, BILL_REMINDER_IDS.length).map((r, i) => ({
      id: BILL_REMINDER_IDS[i],
      title: r.title,
      body: r.body,
      schedule: { at: r.at, allowWhileIdle: true },
    })),
  });
}

export async function cancelBillReminders(): Promise<void> {
  if (!isNativeApp()) return;
  const p = await plugin();
  await p.cancel({ notifications: BILL_REMINDER_IDS.map((id) => ({ id })) });
}

export async function cancelMonthlyReminder(): Promise<void> {
  if (!isNativeApp()) return;
  const p = await plugin();
  await p.cancel({ notifications: MONTHLY_REMINDER_IDS.map((id) => ({ id })) });
}

/** Stable small integer id for a text key (notifications need numeric ids). */
export function notificationId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(hash % 1_000_000) + 2000;
}
