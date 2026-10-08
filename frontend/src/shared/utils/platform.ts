import { Capacitor } from '@capacitor/core';

/** Running inside the Android/iOS app (Capacitor) instead of a browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
