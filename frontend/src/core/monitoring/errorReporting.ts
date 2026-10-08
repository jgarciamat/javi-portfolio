import { API_BASE_URL } from '@core/config/api.config';

export type ErrorKind = 'render' | 'error' | 'unhandledrejection';
export type ErrorReporter = (kind: ErrorKind, error: unknown) => void;

/** Enough to diagnose a page; more would only repeat the same failure. */
const MAX_REPORTS = 5;

/** Sends browser errors to the API log: each message once, a few per page load. */
export function createErrorReporter(endpoint: string): ErrorReporter {
  const seen = new Set<string>();
  return (kind, error) => {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = (err.message.trim() || err.name).slice(0, 500);
    if (seen.size >= MAX_REPORTS || seen.has(message)) return;
    seen.add(message);
    const body = JSON.stringify({
      kind,
      message,
      stack: err.stack?.slice(0, 4000),
      path: window.location.pathname,
    });
    // keepalive: the report still goes out if the page is being closed or reloaded.
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  };
}

export const reportError = createErrorReporter(`${API_BASE_URL}/client-errors`);

/** Reports errors no component caught. Returns the function that removes the listeners. */
export function installErrorReporting(report: ErrorReporter = reportError): () => void {
  const onError = (event: ErrorEvent) => report('error', event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) => report('unhandledrejection', event.reason);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
