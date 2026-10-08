/**
 * Freezes "now" (Date only): timers, promises and RTL's waitFor keep working.
 * Call `restoreTime()` in afterEach.
 */
export function freezeTime(iso = '2026-03-15T12:00:00'): void {
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'performance',
      'hrtime',
    ],
  });
}

export function restoreTime(): void {
  jest.useRealTimers();
}
