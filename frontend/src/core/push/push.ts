import { isNativeApp } from '@shared/utils/platform';

/**
 * Push notifications of the web app (and of the shortcut on the home screen): the browser's
 * push service delivers them through the service worker. Not in the Android app, which uses
 * the notifications of the device itself.
 */
export function pushSupported(): boolean {
  return (
    !isNativeApp() &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** VAPID key (URL-safe base64) as the bytes the push service wants. */
export function keyToBytes(key: string): Uint8Array {
  const padded = (key + '='.repeat((4 - (key.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const registration = () => navigator.serviceWorker.ready;

/** This browser is already subscribed. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  return (await registration()).pushManager.getSubscription();
}

/** Asks for permission and subscribes this browser; null when the person says no. */
export async function subscribePush(publicKey: string): Promise<PushSubscriptionJSON | null> {
  if ((await Notification.requestPermission()) !== 'granted') return null;
  const existing = await currentSubscription();
  const subscription =
    existing ??
    (await (
      await registration()
    ).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(publicKey) as BufferSource,
    }));
  return subscription.toJSON();
}

/** Cancels the subscription of this browser and returns its endpoint (null if there was none). */
export async function unsubscribePush(): Promise<string | null> {
  const subscription = await currentSubscription();
  if (!subscription) return null;
  await subscription.unsubscribe();
  return subscription.endpoint;
}
