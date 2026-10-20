/**
 * Opt-in error tracking for a Sentry-compatible server (Sentry EU, GlitchTip). It is a separate
 * chunk, loaded only when VITE_SENTRY_DSN is set and the first error happens, so the main bundle
 * pays nothing. It speaks the plain envelope protocol over `fetch` (no SDK, no default PII, no
 * cookies, no request bodies, no breadcrumbs, no session replay); the texts are scrubbed of
 * e-mails, tax ids, IBANs, amounts and tokens, and the page is reported without query or ids.
 */

/** Errors that say nothing about the app: network noise, browser quirks, cross-origin scripts. */
const IGNORED =
  /Failed to fetch|NetworkError|Load failed|Network request failed|AbortError|ResizeObserver loop|Script error|dynamically imported module|Importing a module script failed|Non-Error promise rejection/i;
const EXTENSION = /(?:chrome|moz|safari|safari-web)-extension:|webkit-masked-url:/;

/** Text that may carry personal or financial data, replaced before anything is sent. */
export function scrub(text: string): string {
  return text
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]')
    .replace(/(https?:\/\/[^\s?#"')]+)[?#][^\s"')]*/g, '$1')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]')
    .replace(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/g, '[iban]')
    .replace(/\b(?:[XYZKLM]?\d{7,8}[A-Z]|[A-HJ-NP-SUVW]\d{7}[0-9A-J])\b/gi, '[id]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[token]')
    .replace(/(?:€|EUR\s?)\d[\d.,]*|\d[\d.,]*\s?(?:€|EUR\b|euros?\b)/gi, '[amount]')
    .replace(/\d+[.,]\d{1,2}\b/g, '[amount]')
    .replace(/\d{5,}/g, '[n]')
    .slice(0, 1000);
}

/** `https://KEY@HOST/PROJECT` -> where to post the envelopes. Null when it is not a DSN. */
export function parseDsn(dsn: string): { url: string; key: string } | null {
  try {
    const u = new URL(dsn.trim());
    const project = u.pathname.replace(/^\/+|\/+$/g, '');
    if (!/^https?:$/.test(u.protocol) || !u.username || !/^[\w/-]+$/.test(project)) return null;
    return {
      key: u.username,
      url: `${u.protocol}//${u.host}/api/${project.split('/').pop()}/envelope/`,
    };
  } catch {
    return null;
  }
}

/** Path without ids or tokens (`/reset-password/abc` is not worth keeping whole). */
export function pageOf(pathname: string): string {
  return pathname
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}(?=\/|$)/gi, '/:id')
    .replace(/\/(?=[^/]*\d)[^/]{6,}(?=\/|$)/g, '/:id')
    .slice(0, 200);
}

interface Frame {
  function: string;
  filename: string;
  lineno: number;
  colno: number;
}

function frames(stack: string | undefined): Frame[] {
  const out: Frame[] = [];
  for (const line of (stack ?? '').split('\n')) {
    const m =
      /^\s*at (?:(.*?) \()?(.*?):(\d+):(\d+)\)?$/.exec(line) ??
      /^(.*?)@(.*?):(\d+):(\d+)$/.exec(line);
    if (m) {
      out.push({
        function: scrub(m[1] || '?'),
        filename: m[2].split(/[?#]/)[0],
        lineno: Number(m[3]),
        colno: Number(m[4]),
      });
    }
  }
  return out.slice(0, 30).reverse();
}

export interface TrackDeps {
  send?: typeof fetch;
  release?: string;
  environment?: string;
  page?: string;
  now?: () => number;
}

/** Sends one error. Never throws; returns whether something was sent. */
export function track(dsn: string, kind: string, error: unknown, deps: TrackDeps = {}): boolean {
  const target = parseDsn(dsn);
  const err = error instanceof Error ? error : new Error(String(error));
  const stack = frames(err.stack);
  if (!target || IGNORED.test(err.message) || stack.some((f) => EXTENSION.test(f.filename))) {
    return false;
  }
  const send = deps.send ?? fetch;
  const now = (deps.now ?? Date.now)();
  const id = crypto.randomUUID().replace(/-/g, '');
  const event = {
    event_id: id,
    timestamp: now / 1000,
    platform: 'javascript',
    level: 'error',
    release: deps.release,
    environment: deps.environment ?? 'production',
    tags: { kind },
    exception: {
      values: [
        {
          type: scrub(err.name),
          value: scrub(err.message.trim() || err.name),
          stacktrace: { frames: stack },
        },
      ],
    },
    request: { url: pageOf(deps.page ?? window.location.pathname) },
  };
  const body = [
    JSON.stringify({ event_id: id, sent_at: new Date(now).toISOString() }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n');
  send(`${target.url}?sentry_key=${target.key}&sentry_version=7`, {
    method: 'POST',
    // text/plain: a "simple" request, so the browser sends no preflight.
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => undefined);
  return true;
}
