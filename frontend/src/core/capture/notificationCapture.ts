import { Capacitor, registerPlugin } from '@capacitor/core';

/** A notification kept by the Android service until the app picks it up. */
export interface CapturedNotification {
  packageName: string;
  title: string;
  text: string;
  postedAt: number;
}

/**
 * How the phone tells about payments waiting in «Para revisar», with the texts in the person's
 * language: `each`, a notification as they are detected (one, with the number, for several);
 * `daily`, one at 21:00 while there are some; `off`, none. They never carry amounts or shops.
 */
export interface CaptureAlerts {
  alert: 'daily' | 'each' | 'off';
  texts: {
    channel: string;
    eachTitle: string;
    /** With `{count}`, for several. */
    manyTitle: string;
    eachBody: string;
    dailyTitle: string;
    dailyBody: string;
  };
}

interface NotificationCapturePlugin {
  /** `listenerEnabled`: the person gave the app access to notifications in the system settings. */
  status(): Promise<{ listenerEnabled: boolean; enabled: boolean }>;
  openSettings(): Promise<void>;
  configure(
    options: { enabled: boolean; packages: string[] } & Partial<CaptureAlerts>
  ): Promise<void>;
  /** The notifications kept so far; they are removed from the service. */
  drain(): Promise<{ notifications: CapturedNotification[] }>;
  /** How many payments wait in «Para revisar» (none: the reminder is not needed). */
  review(options: { waiting: number }): Promise<void>;
}

const plugin = registerPlugin<NotificationCapturePlugin>('NotificationCapture');

/** Reading bank notifications only exists in the Android app. */
export const captureSupported = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const captureStatus = () => plugin.status();
export const openCaptureSettings = () => plugin.openSettings();
export const configureCapture = (enabled: boolean, packages: string[], alerts?: CaptureAlerts) =>
  plugin.configure({ enabled, packages, ...alerts });
export const drainCaptured = async (): Promise<CapturedNotification[]> =>
  (await plugin.drain()).notifications;
export const reportWaiting = (waiting: number) => plugin.review({ waiting });
