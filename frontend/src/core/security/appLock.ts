import { isNativeApp } from '@shared/utils/platform';
import { storage } from '@shared/utils/storage';

/**
 * App lock: a PIN (and, in the Android app, the fingerprint or face of the device) asked when
 * the app opens and when it comes back from the background. It keeps other people who pick up
 * the phone out of the numbers; it is not encryption of the data. Only a salted hash of the
 * PIN is stored, on this device.
 */
const KEY = 'mm_app_lock';
const ITERATIONS = 100_000;
export const PIN_MIN = 4;
export const PIN_MAX = 6;

/** Seconds in the background before the app locks (0 = every time it is left). */
export const LOCK_TIMEOUTS = [0, 60, 300] as const;

export interface LockConfig {
  salt: string;
  hash: string;
  pinLength: number;
  biometric: boolean;
  timeoutSec: number;
}

export const isValidPin = (pin: string): boolean =>
  /^\d+$/.test(pin) && pin.length >= PIN_MIN && pin.length <= PIN_MAX;

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string): Uint8Array =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS },
    key,
    256
  );
  return toBase64(new Uint8Array(bits));
}

export function loadLock(): LockConfig | null {
  return storage.getJSON<LockConfig | null>(KEY, null);
}

export function clearLock(): void {
  storage.set(KEY, null);
}

/** Turns the lock on (or changes its PIN and options). */
export async function saveLock(
  pin: string,
  options: { biometric: boolean; timeoutSec: number }
): Promise<LockConfig> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const config: LockConfig = {
    salt: toBase64(salt),
    hash: await derive(pin, salt),
    pinLength: pin.length,
    ...options,
  };
  storage.setJSON(KEY, config);
  return config;
}

/** Changes the options without touching the PIN. */
export function updateLockOptions(
  config: LockConfig,
  options: Partial<Pick<LockConfig, 'biometric' | 'timeoutSec'>>
): LockConfig {
  const next = { ...config, ...options };
  storage.setJSON(KEY, next);
  return next;
}

export async function verifyPin(config: LockConfig, pin: string): Promise<boolean> {
  return (await derive(pin, fromBase64(config.salt))) === config.hash;
}

async function biometricPlugin() {
  const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
  return BiometricAuth;
}

/** The Android app on a device with a fingerprint or face enrolled. */
export async function biometricAvailable(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    return (await (await biometricPlugin()).checkBiometry()).isAvailable;
  } catch {
    return false;
  }
}

/** Asks the device to recognise the owner; false when cancelled or refused. */
export async function biometricUnlock(reason: string, cancelTitle: string): Promise<boolean> {
  try {
    await (
      await biometricPlugin()
    ).authenticate({ reason, cancelTitle, allowDeviceCredential: false });
    return true;
  } catch {
    return false;
  }
}
