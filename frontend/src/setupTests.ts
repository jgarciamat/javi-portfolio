import '@testing-library/jest-dom';
import { loadAllTexts, loadLocale } from '@core/i18n/I18nContext';

// The app downloads English and the rest of the texts on demand; tests render them straight away
// (i18n.test covers the wait).
beforeAll(async () => {
  await loadAllTexts();
  await loadLocale('en');
});

// Suppress act() warnings caused by async state updates in hooks.
// @testing-library/react already wraps assertions in act() via waitFor,
// but intermediate setState calls during async operations still trigger this warning.
const originalError = console.error.bind(console);
beforeAll(() => {
  console.error = (...args: Parameters<typeof console.error>) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('not wrapped in act(')) return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});

// jsdom lacks TextEncoder/TextDecoder (used to read bank statements in the import modal).
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util';
if (typeof globalThis.TextDecoder === 'undefined') {
  Object.assign(globalThis, { TextDecoder: NodeTextDecoder, TextEncoder: NodeTextEncoder });
}

// jsdom does not scroll: the guided tour scrolls the highlighted element into view.
Element.prototype.scrollIntoView = function scrollIntoView() {};

// jsdom has no WebCrypto: the app lock hashes its PIN with PBKDF2.
import { webcrypto } from 'crypto';
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
