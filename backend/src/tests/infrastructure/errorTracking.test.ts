import {
  createErrorTracker,
  noopTracker,
  parseDsn,
  routeOf,
  scrub,
} from '@infrastructure/monitoring/errorTracking';

const DSN = 'https://abc123@o1.ingest.de.sentry.io/42';

describe('error tracking (opt-in)', () => {
  it('is off without a DSN or with an invalid one', () => {
    expect(createErrorTracker(undefined)).toBe(noopTracker);
    expect(createErrorTracker('')).toBe(noopTracker);
    expect(createErrorTracker('not a dsn')).toBe(noopTracker);
    expect(noopTracker.capture(new Error('x'))).toBeUndefined();
  });

  it('parses DSNs', () => {
    expect(parseDsn(DSN)).toEqual({
      key: 'abc123',
      url: 'https://o1.ingest.de.sentry.io/api/42/envelope/',
    });
    expect(parseDsn('https://k@glitch.example.com/sub/7')?.url).toBe(
      'https://glitch.example.com/api/7/envelope/'
    );
    expect(parseDsn('ftp://k@h/1')).toBeNull();
    expect(parseDsn('https://h/1')).toBeNull();
    expect(parseDsn('https://k@h/')).toBeNull();
    expect(parseDsn(null)).toBeNull();
  });

  it('scrubs personal and financial data', () => {
    const text =
      'ana@example.com 12345678Z X1234567L B12345678 ES9121000418450200051332 1.234,56 € ' +
      '€ 20 12,5 EUR 99 euros 1234567 eyJhbGciOi.eyJzdWIi.sig-1 https://x.app/a?token=abc#f ' +
      'abcdefghijklmnopqrstuvwxyz0123456789';
    const out = scrub(text);
    for (const leak of [
      'ana@',
      '12345678Z',
      'X1234567L',
      'B12345678',
      'ES91',
      '1.234',
      '1234567',
      'eyJ',
      'token=',
      'abcdefghijkl',
    ]) {
      expect(out).not.toContain(leak);
    }
    expect(out).toContain('https://x.app/a');
    expect(scrub('x'.repeat(5000)).length).toBeLessThanOrEqual(1000);
  });

  it('keeps ids out of the route', () => {
    expect(routeOf('/api/transactions/123/x?token=1')).toBe('/api/transactions/:id/x');
    expect(routeOf('/api/a/3f2b8c1e-1234-4abc-8def-0123456789ab')).toBe('/api/a/:id');
    expect(routeOf(undefined)).toBeUndefined();
  });

  it('sends a scrubbed envelope, without bodies, headers or users', () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true });
    const tracker = createErrorTracker(DSN, { fetchFn, release: 'r1', now: () => 1_000_000 });
    const err = new Error('failed for ana@example.com amount 12,50');
    err.stack = `Error: x\n    at save (/app/dist/a.js:10:5)\n    at /app/dist/b.js?v=1:2:3\nnoise`;
    tracker.capture(err, { method: 'POST', path: '/api/transactions/55?email=a@b.es' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(
      'https://o1.ingest.de.sentry.io/api/42/envelope/?sentry_key=abc123&sentry_version=7'
    );
    const [header, item, event] = (init.body as string).split('\n').map((l) => JSON.parse(l));
    expect(header.event_id).toHaveLength(32);
    expect(item).toEqual({ type: 'event' });
    expect(event.exception.values[0].value).toBe('failed for [email] amount [amount]');
    expect(event.exception.values[0].stacktrace.frames).toEqual([
      { function: '?', filename: '/app/dist/b.js', lineno: 2, colno: 3 },
      { function: 'save', filename: '/app/dist/a.js', lineno: 10, colno: 5 },
    ]);
    expect(event.request).toEqual({ method: 'POST', url: '/api/transactions/:id' });
    expect(event.release).toBe('r1');
    expect(event.environment).toBe('production');
    expect(event).not.toHaveProperty('user');
    expect(JSON.stringify(event)).not.toMatch(/ana@|a@b\.es|cookie/i);
  });

  it('skips network noise, repeats within a minute and floods of different errors', () => {
    let t = 0;
    const fetchFn = jest.fn().mockRejectedValue(new Error('down'));
    const tracker = createErrorTracker(DSN, { fetchFn, now: () => t, environment: 'test' });
    tracker.capture(new Error('read ECONNRESET'));
    tracker.capture('Failed to fetch');
    expect(fetchFn).not.toHaveBeenCalled();
    tracker.capture('boom');
    tracker.capture(new Error('boom'));
    expect(fetchFn).toHaveBeenCalledTimes(1);
    t = 61_000;
    tracker.capture(new Error('boom'));
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const noStack = new Error('');
    delete noStack.stack;
    tracker.capture(noStack);
    for (let i = 0; i < 250; i++) tracker.capture(new Error(`err-${'ab'.repeat(i % 7)}-${i}x`));
    expect(fetchFn.mock.calls.length).toBeLessThan(250);
  });
});
