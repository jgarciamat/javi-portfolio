/**
 * Opt-in error tracking for a Sentry-compatible server (Sentry EU, GlitchTip). Active only when
 * SENTRY_DSN is set; empty means off and nothing is sent. It speaks the plain envelope protocol
 * over `fetch`, so no SDK (and no extra dependency) is needed, and every field that leaves the
 * server is built here: no request bodies, headers, cookies, query strings or user data, and the
 * texts are scrubbed of e-mails, tax ids, IBANs, amounts and tokens.
 */
import { randomUUID } from 'node:crypto';

export interface ErrorTracker {
  capture(error: unknown, context?: { method?: string; path?: string }): void;
}

export const noopTracker: ErrorTracker = { capture: () => undefined };

/** Errors that say nothing about the app (clients going away, network noise). */
const IGNORED = /ECONNRESET|EPIPE|socket hang up|request aborted|Failed to fetch|NetworkError/i;

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
export function parseDsn(dsn: string | null | undefined): { url: string; key: string } | null {
  try {
    const u = new URL((dsn ?? '').trim());
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

function frames(stack: string | undefined) {
  const out = [];
  for (const line of (stack ?? '').split('\n')) {
    const m = /^\s*at (?:(.*?) \()?(.*?):(\d+):(\d+)\)?$/.exec(line);
    if (m) {
      out.push({
        function: scrub(m[1] ?? '?'),
        filename: m[2].split(/[?#]/)[0].replace(/^file:\/\//, ''),
        lineno: Number(m[3]),
        colno: Number(m[4]),
      });
    }
  }
  return out.slice(0, 30).reverse();
}

/** Route path without ids, so no resource id or token reaches the tracker. */
export function routeOf(path: string | undefined): string | undefined {
  return path
    ?.split(/[?#]/)[0]
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}(?=\/|$)/gi, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .slice(0, 200);
}

export interface TrackerOptions {
  fetchFn?: typeof fetch;
  release?: string;
  environment?: string;
  /** Same message at most once per this many ms (default one minute). */
  dedupeMs?: number;
  now?: () => number;
}

/** A tracker for the DSN, or the no-op one when the DSN is empty or invalid. */
export function createErrorTracker(
  dsn: string | null | undefined,
  options: TrackerOptions = {}
): ErrorTracker {
  const target = parseDsn(dsn);
  if (!target) return noopTracker;
  const send = options.fetchFn ?? fetch;
  const now = options.now ?? Date.now;
  const dedupeMs = options.dedupeMs ?? 60_000;
  const last = new Map<string, number>();
  return {
    capture(error, context) {
      const err = error instanceof Error ? error : new Error(String(error));
      const message = scrub(err.message.trim() || err.name);
      if (IGNORED.test(err.message)) return;
      const t = now();
      if (t - (last.get(message) ?? -Infinity) < dedupeMs || last.size > 200) return;
      last.set(message, t);
      const id = randomUUID().replace(/-/g, '');
      const event = {
        event_id: id,
        timestamp: t / 1000,
        platform: 'node',
        level: 'error',
        release: options.release,
        environment: options.environment ?? 'production',
        server_name: 'api',
        exception: {
          values: [
            {
              type: scrub(err.name),
              value: message,
              stacktrace: { frames: frames(err.stack) },
            },
          ],
        },
        request: context?.path ? { method: context.method, url: routeOf(context.path) } : undefined,
      };
      const body = [
        JSON.stringify({ event_id: id, sent_at: new Date(t).toISOString() }),
        JSON.stringify({ type: 'event' }),
        JSON.stringify(event),
      ].join('\n');
      send(`${target.url}?sentry_key=${target.key}&sentry_version=7`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-sentry-envelope' },
        body,
        signal: AbortSignal.timeout(3000),
      }).catch(() => undefined);
    },
  };
}
