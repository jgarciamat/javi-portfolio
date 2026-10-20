import { forwardToTracker } from '@core/monitoring/errorReporting';
import { pageOf, parseDsn, scrub, track } from '@core/monitoring/errorTracking';

const DSN = 'https://abc123@o1.ingest.de.sentry.io/42';

/** The event of the envelope sent by the n-th call. */
const eventOf = (send: jest.Mock, n = 0) =>
  JSON.parse((send.mock.calls[n][1].body as string).split('\n')[2]);

describe('error tracking (opt-in)', () => {
  it('parses DSNs', () => {
    expect(parseDsn(DSN)).toEqual({
      key: 'abc123',
      url: 'https://o1.ingest.de.sentry.io/api/42/envelope/',
    });
    expect(parseDsn('https://k@glitch.example.com/sub/7')?.url).toBe(
      'https://glitch.example.com/api/7/envelope/'
    );
    for (const bad of ['', 'nope', 'ftp://k@h/1', 'https://h/1', 'https://k@h/']) {
      expect(parseDsn(bad)).toBeNull();
    }
  });

  it('scrubs e-mails, tax ids, IBANs, amounts and tokens', () => {
    const out = scrub(
      'ana@example.com 12345678Z X1234567L B12345678 ES9121000418450200051332 1.234,56 € ' +
        '€ 20 12,5 EUR 99 euros 1234567 eyJhbGciOi.eyJzdWIi.sig-1 https://x.app/a?token=abc#f ' +
        'abcdefghijklmnopqrstuvwxyz0123456789'
    );
    for (const leak of [
      'ana@',
      '12345678Z',
      'X1234567L',
      'B12345678',
      'ES91',
      '1.234',
      '1234567',
    ]) {
      expect(out).not.toContain(leak);
    }
    for (const leak of ['eyJ', 'token=', 'abcdefghijkl']) expect(out).not.toContain(leak);
    expect(out).toContain('https://x.app/a');
    expect(scrub('x '.repeat(1500))).toHaveLength(1000);
  });

  it('reports a page without ids or tokens', () => {
    expect(pageOf('/pricing')).toBe('/pricing');
    expect(pageOf('/reset/abc123def456')).toBe('/reset/:id');
    expect(pageOf('/a/3f2b8c1e-1234-4abc-8def-0123456789ab')).toBe('/a/:id');
  });

  it('sends a scrubbed envelope: no user, cookies, headers, query or body', () => {
    const send = jest.fn().mockResolvedValue({ ok: true });
    const error = new Error('failed for ana@example.com amount 12,50');
    error.stack =
      'Error: x\n    at save (https://finanverso.app/assets/a.js?v=1:10:5)\n' +
      '    at https://finanverso.app/assets/b.js:2:3\nfirefoxFn@https://finanverso.app/assets/c.js:7:8\nnoise';
    expect(
      track(DSN, 'render', error, {
        send,
        release: 'r1',
        page: '/mensual',
        now: () => 1_000_000,
      })
    ).toBe(true);
    const [url, init] = send.mock.calls[0];
    expect(url).toBe(
      'https://o1.ingest.de.sentry.io/api/42/envelope/?sentry_key=abc123&sentry_version=7'
    );
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', keepalive: true });
    const event = eventOf(send);
    expect(event.exception.values[0].value).toBe('failed for [email] amount [amount]');
    expect(event.exception.values[0].stacktrace.frames).toEqual([
      {
        function: 'firefoxFn',
        filename: 'https://finanverso.app/assets/c.js',
        lineno: 7,
        colno: 8,
      },
      { function: '?', filename: 'https://finanverso.app/assets/b.js', lineno: 2, colno: 3 },
      { function: 'save', filename: 'https://finanverso.app/assets/a.js', lineno: 10, colno: 5 },
    ]);
    expect(event).toMatchObject({
      release: 'r1',
      environment: 'production',
      tags: { kind: 'render' },
      request: { url: '/mensual' },
    });
    expect(Object.keys(event)).not.toContain('user');
    expect(JSON.stringify(event)).not.toMatch(/ana@|cookie/i);
  });

  it('uses the current page, plain values and the default clock', () => {
    const send = jest.fn().mockResolvedValue({ ok: true });
    expect(track(DSN, 'error', 'plain', { send, environment: 'staging' })).toBe(true);
    expect(eventOf(send)).toMatchObject({
      environment: 'staging',
      request: { url: '/' },
      exception: { values: [{ type: 'Error', value: 'plain' }] },
    });
    const noStack = new TypeError('');
    delete noStack.stack;
    track(DSN, 'error', noStack, { send });
    expect(eventOf(send, 1).exception.values[0].value).toBe('TypeError');
  });

  it('ignores network noise, extensions, an invalid DSN, and a failed delivery', async () => {
    const send = jest.fn().mockRejectedValue(new Error('offline'));
    expect(track(DSN, 'error', new TypeError('Failed to fetch'), { send })).toBe(false);
    expect(track(DSN, 'error', 'Script error.', { send })).toBe(false);
    const fromExtension = new Error('boom');
    fromExtension.stack = 'Error\n    at x (chrome-extension://abc/inject.js:1:2)';
    expect(track(DSN, 'error', fromExtension, { send })).toBe(false);
    expect(track('', 'error', new Error('x'), { send })).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(track(DSN, 'error', new Error('real'), { send })).toBe(true);
    await Promise.resolve();
  });

  it('forwardToTracker does nothing without a DSN and loads the tracker with one', async () => {
    const send = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = send as unknown as typeof fetch;
    forwardToTracker('', 'error', new Error('off'));
    await new Promise((r) => setTimeout(r, 20));
    expect(send).not.toHaveBeenCalled();
    forwardToTracker(DSN, 'error', new Error('on'));
    await new Promise((r) => setTimeout(r, 50));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toContain('o1.ingest.de.sentry.io');
  });
});
