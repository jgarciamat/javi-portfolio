import request from 'supertest';
import { TestContext, createTestApp } from '../helpers/testApp';

describe('CSP violation reports', () => {
  let ctx: TestContext;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    ctx = createTestApp();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  const lines = () =>
    warn.mock.calls.map((c) => c[0] as string).filter((l) => l.startsWith('[csp] '));

  it('logs a report-uri report (application/csp-report) without query strings, no session needed', async () => {
    await request(ctx.app)
      .post('/api/csp-report')
      .set('Content-Type', 'application/csp-report')
      .send(
        JSON.stringify({
          'csp-report': {
            'effective-directive': 'script-src-elem',
            'blocked-uri': 'https://evil.example/x.js?token=secret#frag',
            'document-uri': 'https://finanverso.app/reset-password?token=secret',
            disposition: 'report',
            'original-policy': 'default-src self; very long policy',
          },
        })
      )
      .expect(204);
    const [line] = lines();
    expect(JSON.parse(line.slice(6))).toEqual({
      directive: 'script-src-elem',
      blocked: 'https://evil.example/x.js',
      page: 'https://finanverso.app/reset-password',
      disposition: 'report',
      count: expect.any(Number),
    });
    expect(line).not.toContain('secret');
    expect(line).not.toContain('original-policy');
  });

  it('logs a report-to batch (application/reports+json) and counts per directive', async () => {
    const report = (n: number) => ({
      type: 'csp-violation',
      body: {
        effectiveDirective: 'img-src',
        blockedURL: `https://x.example/${n}.png?u=1`,
        documentURL: 'https://finanverso.app/',
        disposition: 'enforce',
      },
    });
    await request(ctx.app)
      .post('/api/csp-report')
      .set('Content-Type', 'application/reports+json')
      .send(JSON.stringify([report(1), report(2)]))
      .expect(204);
    const parsed = lines().map((l) => JSON.parse(l.slice(6)));
    expect(parsed).toHaveLength(2);
    expect(parsed[1].count).toBe(parsed[0].count + 1);
    expect(parsed[0].blocked).toBe('https://x.example/1.png');
  });

  it('ignores junk and truncates long values', async () => {
    await request(ctx.app)
      .post('/api/csp-report')
      .set('Content-Type', 'application/csp-report')
      .send('{}')
      .expect(204);
    await request(ctx.app)
      .post('/api/csp-report')
      .send([null, { body: {} }])
      .expect(204);
    expect(lines()).toHaveLength(0);
    await request(ctx.app)
      .post('/api/csp-report')
      .send({
        'csp-report': { 'violated-directive': 'a'.repeat(500), 'blocked-uri': 'b'.repeat(500) },
      })
      .expect(204);
    const parsed = JSON.parse(lines()[0].slice(6));
    expect(parsed.directive).toHaveLength(40);
    expect(parsed.blocked).toHaveLength(120);
  });

  it('stops tracking new directives after a cap', async () => {
    for (let i = 0; i < 60; i++) {
      await request(ctx.app)
        .post('/api/csp-report')
        .send({ 'csp-report': { 'effective-directive': `d${i}` } })
        .expect(204);
    }
    expect(lines().length).toBeLessThanOrEqual(50);
  });
});
