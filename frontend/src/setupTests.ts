import '@testing-library/jest-dom';

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
