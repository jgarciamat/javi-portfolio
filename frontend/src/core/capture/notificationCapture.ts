import { Capacitor, registerPlugin } from '@capacitor/core';

/** A notification kept by the Android service until the app picks it up. */
export interface CapturedNotification {
  packageName: string;
  title: string;
  text: string;
  postedAt: number;
}

interface NotificationCapturePlugin {
  /** `listenerEnabled`: the person gave the app access to notifications in the system settings. */
  status(): Promise<{ listenerEnabled: boolean; enabled: boolean }>;
  openSettings(): Promise<void>;
  configure(options: { enabled: boolean; packages: string[] }): Promise<void>;
  /** The notifications kept so far; they are removed from the service. */
  drain(): Promise<{ notifications: CapturedNotification[] }>;
}

const plugin = registerPlugin<NotificationCapturePlugin>('NotificationCapture');

/** Reading bank notifications only exists in the Android app. */
export const captureSupported = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const captureStatus = () => plugin.status();
export const openCaptureSettings = () => plugin.openSettings();
export const configureCapture = (enabled: boolean, packages: string[]) =>
  plugin.configure({ enabled, packages });
export const drainCaptured = async (): Promise<CapturedNotification[]> =>
  (await plugin.drain()).notifications;
