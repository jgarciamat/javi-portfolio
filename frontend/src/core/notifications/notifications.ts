import { isNativeApp } from '@shared/utils/platform';

/**
 * Local notifications: native (Android/iOS via @capacitor/local-notifications)
 * or the browser Notification API. They are generated on the device; there is
 * no push server involved.
 */

const MONTHLY_REMINDER_ID = 1001;

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

/** Native only: a reminder at 9:00 on the first day of each period. */
export async function scheduleMonthlyReminder(
  day: number,
  title: string,
  body: string
): Promise<void> {
  if (!isNativeApp()) return;
  const p = await plugin();
  await p.cancel({ notifications: [{ id: MONTHLY_REMINDER_ID }] });
  await p.schedule({
    notifications: [
      {
        id: MONTHLY_REMINDER_ID,
        title,
        body,
        schedule: { on: { day, hour: 9, minute: 0 }, allowWhileIdle: true },
      },
    ],
  });
}

export async function cancelMonthlyReminder(): Promise<void> {
  if (!isNativeApp()) return;
  const p = await plugin();
  await p.cancel({ notifications: [{ id: MONTHLY_REMINDER_ID }] });
}

/** Stable small integer id for a text key (notifications need numeric ids). */
export function notificationId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(hash % 1_000_000) + 2000;
}
