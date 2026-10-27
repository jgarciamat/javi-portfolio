import { useSyncExternalStore } from 'react';

/**
 * Whether a session is open (or being restored), for what lives outside AuthProvider: the
 * service worker of UpdatePrompt, which only installs for people who use the app, so a first
 * visit to the landing or a guide does not download the whole offline cache.
 * AuthProvider keeps it up to date.
 */
let open = false;
const listeners = new Set<() => void>();

export function setSessionOpen(value: boolean): void {
  if (value === open) return;
  open = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSessionOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open);
}
