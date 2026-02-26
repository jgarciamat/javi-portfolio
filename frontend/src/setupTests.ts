import '@testing-library/jest-dom';

// Suppress React 18 act() warnings caused by async state updates in hooks.
// @testing-library/react already wraps assertions in act() via waitFor,
// but intermediate setState calls during async operations still trigger this warning.
const originalError = console.error.bind(console);
beforeAll(() => {
    console.error = (...args: Parameters<typeof console.error>) => {
        const msg = typeof args[0] === 'string' ? args[0] : '';
        if (
            msg.includes('not wrapped in act(') ||
            msg.includes('React Router Future Flag Warning')
        ) return;
        originalError(...args);
    };
});
afterAll(() => {
    console.error = originalError;
});

// Suppress React Router v6 future flag deprecation warnings in tests.
const originalWarn = console.warn.bind(console);
beforeAll(() => {
    console.warn = (...args: Parameters<typeof console.warn>) => {
        const msg = typeof args[0] === 'string' ? args[0] : '';
        if (msg.includes('React Router Future Flag Warning')) return;
        originalWarn(...args);
    };
});
afterAll(() => {
    console.warn = originalWarn;
});
