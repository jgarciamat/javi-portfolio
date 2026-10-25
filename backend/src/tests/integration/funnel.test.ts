import request from 'supertest';
import { normalizeOrigin, referrerSource } from '@application/analytics/origin';
import { ActivationTracker } from '@application/analytics/ActivationTracker';
import { openDatabase } from '@infrastructure/sqlite/database';
import { formatFunnel } from '@infrastructure/sqlite/funnelReport';
import { migrate } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';
import {
  MAX_ROWS_PER_DAY,
  SqliteFunnelRepository,
} from '@infrastructure/sqlite/repositories/SqliteFunnelRepository';
import { ownHosts } from '@infrastructure/http/routes/funnel.routes';
import {
  STRONG_PASSWORD,
  TestContext,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

const OWN = ['finanverso.app'];

type Row = { event: string; source: string; campaign: string; detail: string; count: number };
const rows = (ctx: TestContext): Row[] =>
  ctx.container.db
    .prepare('SELECT event, source, campaign, detail, count FROM funnel_daily ORDER BY 1, 2, 3, 4')
    .all() as Row[];
const total = (ctx: TestContext, event: string): number =>
  rows(ctx)
    .filter((r) => r.event === event)
    .reduce((n, r) => n + r.count, 0);
const send = (ctx: TestContext, body: unknown, userAgent = 'Mozilla/5.0 Firefox/130') =>
  request(ctx.app)
    .post('/api/funnel')
    .set('User-Agent', userAgent)
    .send(body as object);

describe('Origin normalised on the server', () => {
  it('prefers the campaign, cleaned, and joins campaign and video', () => {
    expect(
      normalizeOrigin(
        { utm_source: ' TikTok! ', utm_campaign: 'Renta 2026', utm_content: 'v041', ref: 'x.com' },
        OWN
      )
    ).toEqual({ source: 'tiktok', campaign: 'renta2026/v041' });
    expect(normalizeOrigin({ utm_source: 'a'.repeat(90) }, OWN).source).toHaveLength(40);
    expect(normalizeOrigin({ utm_content: 'v1' }, OWN)).toEqual({
      source: '(direct)',
      campaign: '/v1',
    });
  });

  it('groups known sites and keeps other hosts', () => {
    expect(referrerSource('www.google.es', OWN)).toBe('google');
    expect(referrerSource('news.google.com', OWN)).toBe('google');
    expect(referrerSource('l.instagram.com', OWN)).toBe('instagram');
    expect(referrerSource('t.co', OWN)).toBe('x');
    expect(referrerSource('m.youtube.com', OWN)).toBe('youtube');
    expect(referrerSource('lm.facebook.com', OWN)).toBe('facebook');
    expect(referrerSource('chatgpt.com', OWN)).toBe('chatgpt');
    expect(referrerSource('www.Rankia.com', OWN)).toBe('rankia.com');
    expect(referrerSource(`${'a'.repeat(60)}.com`, OWN)).toHaveLength(40);
  });

  it('treats our own pages, local hosts, IPs and nothing as direct', () => {
    expect(referrerSource('www.finanverso.app', OWN)).toBe('(direct)');
    expect(referrerSource('localhost', OWN)).toBe('(direct)');
    expect(referrerSource('192.168.1.10', OWN)).toBe('(direct)');
    expect(referrerSource(undefined, OWN)).toBe('(direct)');
    expect(normalizeOrigin(undefined, OWN)).toEqual({ source: '(direct)', campaign: '' });
    expect(normalizeOrigin({ app: true }, OWN).source).toBe('(app)');
    expect(normalizeOrigin({ app: true, utm_source: 'push' }, OWN).source).toBe('push');
  });

  it('knows our host names from the configuration', () => {
    const ctx = createTestApp({ env: { CORS_ORIGINS: 'https://finanverso.app,not a url' } });
    expect(ownHosts(ctx.container)).toEqual(
      expect.arrayContaining(['localhost', 'finanverso.app'])
    );
    expect(ownHosts(ctx.container)).not.toContain('');
  });
});

describe('POST /api/funnel', () => {
  it('counts an event per day and origin, without IP, user agent or identifiers', async () => {
    const ctx = createTestApp();
    await send(ctx, { event: 'visit', utm_source: 'TikTok', utm_campaign: 'renta2026' }).expect(
      204
    );
    await send(ctx, { event: 'visit', utm_source: 'tiktok', utm_campaign: 'renta2026' }).expect(
      204
    );
    await send(ctx, { event: 'guide_view', guide: 'modelo-303', ref: 'www.google.es' }).expect(204);
    await send(ctx, { event: 'paywall_view', app: true }).expect(204);
    await send(ctx, { event: 'cons_invite_copy' }).expect(204);
    expect(rows(ctx)).toEqual([
      { event: 'cons_invite_copy', source: '(direct)', campaign: '', detail: '', count: 1 },
      { event: 'guide_view', source: 'google', campaign: '', detail: 'modelo-303', count: 1 },
      { event: 'paywall_view', source: '(app)', campaign: '', detail: '', count: 1 },
      { event: 'visit', source: 'tiktok', campaign: 'renta2026', detail: '', count: 2 },
    ]);
    const columns = (
      ctx.container.db.prepare('PRAGMA table_info(funnel_daily)').all() as { name: string }[]
    ).map((c) => c.name);
    expect(columns).toEqual(['day', 'event', 'source', 'campaign', 'detail', 'count']);
  });

  it('rejects events outside the closed list, server events, extra fields and free text', async () => {
    const ctx = createTestApp();
    await send(ctx, { event: 'purchase' }).expect(400);
    await send(ctx, { event: 'signup' }).expect(400);
    await send(ctx, { event: 'premium' }).expect(400);
    await send(ctx, { event: 'visit', email: 'a@b.es' }).expect(400);
    await send(ctx, { event: 'visit', userId: 'u1' }).expect(400);
    await send(ctx, { event: 'guide_view', guide: 'Hola Mundo' }).expect(400);
    await send(ctx, { event: 'visit', utm_source: 'x'.repeat(81) }).expect(400);
    await send(ctx, { event: 'visit', app: 'yes' }).expect(400);
    await send(ctx, 'visit').expect(400);
    expect(rows(ctx)).toEqual([]);
  });

  it('takes a detail only from the closed list of its event', async () => {
    const ctx = createTestApp();
    await send(ctx, { event: 'dp_view', detail: 'complete' }).expect(204);
    await send(ctx, { event: 'dp_import_cta', detail: 'none' }).expect(204);
    await send(ctx, { event: 'paywall_view', detail: 'dp' }).expect(204);
    await send(ctx, { event: 'goal_date_view', detail: 'real' }).expect(204);
    await send(ctx, { event: 'goal_sim_change', detail: 'slider' }).expect(204);
    await send(ctx, { event: 'goal_dp_apply' }).expect(204);
    await send(ctx, { event: 'dp_view', detail: 'other' }).expect(400);
    await send(ctx, { event: 'dp_import_cta', detail: 'complete' }).expect(400);
    await send(ctx, { event: 'goal_dp_apply', detail: 'dp' }).expect(400);
    await send(ctx, { event: 'visit', detail: 'none' }).expect(400);
    await send(ctx, { event: 'dp_view', detail: 'x'.repeat(21) }).expect(400);
    await send(ctx, { event: 'dp_found', detail: '1-2' }).expect(400);
    expect(rows(ctx).map((r) => `${r.event}:${r.detail}`)).toEqual([
      'dp_import_cta:none',
      'dp_view:complete',
      'goal_date_view:real',
      'goal_dp_apply:',
      'goal_sim_change:slider',
      'paywall_view:dp',
    ]);
  });

  it('answers but does not count crawlers and headless browsers', async () => {
    const ctx = createTestApp();
    await send(ctx, { event: 'visit' }, 'Googlebot/2.1').expect(204);
    await send(ctx, { event: 'visit' }, 'Mozilla/5.0 HeadlessChrome/120').expect(204);
    await request(ctx.app).post('/api/funnel').unset('User-Agent').send({ event: 'visit' });
    expect(total(ctx, 'visit')).toBe(1);
  });

  it('is rate limited per network', async () => {
    const ctx = createTestApp({ env: { NODE_ENV: 'development', RATE_LIMIT_DISABLED: 'false' } });
    for (let i = 0; i < 30; i++) await send(ctx, { event: 'visit' }).expect(204);
    await send(ctx, { event: 'visit' }).expect(429);
    expect(total(ctx, 'visit')).toBe(30);
  });
});

describe('Server funnel steps', () => {
  it('counts the sign-up and its trial by the origin sent with it, storing nothing on the account', async () => {
    const ctx = createTestApp();
    const register = (email: string, origin: unknown) =>
      request(ctx.app)
        .post('/api/auth/register')
        .send({ email, password: STRONG_PASSWORD, name: 'Ana', origin })
        .expect(201);
    await register('a@example.com', { utm_source: 'youtube', utm_content: 'v7' });
    // A malformed origin never blocks the sign-up: it counts as unknown.
    await register('b@example.com', { utm_source: 'x', email: 'leak@x.es' });
    await register('c@example.com', undefined);
    // An address that already has an account is not a sign-up.
    await register('a@example.com', { utm_source: 'youtube' });
    expect(rows(ctx).filter((r) => r.event === 'signup')).toEqual([
      { event: 'signup', source: '(unknown)', campaign: '', detail: '', count: 2 },
      { event: 'signup', source: 'youtube', campaign: '/v7', detail: '', count: 1 },
    ]);
    expect(total(ctx, 'trial_start')).toBe(3);
    const user = ctx.container.db
      .prepare("SELECT * FROM users WHERE email = 'a@example.com'")
      .get() as Record<string, unknown>;
    expect(JSON.stringify(user)).not.toContain('youtube');
  });

  it('counts Google sign-ups once, with their origin, as verified', async () => {
    const ctx = createTestApp();
    ctx.google.identities.set('good', {
      googleId: 'g-1',
      email: 'gina@gmail.com',
      emailVerified: true,
      name: 'Gina',
    });
    const google = () =>
      request(ctx.app)
        .post('/api/auth/google')
        .send({ token: 'good', origin: { ref: 'www.bing.com' } })
        .expect(200);
    await google();
    await google();
    expect(rows(ctx).filter((r) => r.event === 'signup')).toEqual([
      { event: 'signup', source: 'bing', campaign: '', detail: '', count: 1 },
    ]);
    expect(total(ctx, 'email_verified')).toBe(1);
  });

  it('counts the first movement and each activation step once, then the activation', async () => {
    const ctx = createTestApp();
    const user = await createUser(ctx);
    const tx = () => addTransaction(ctx, user, { type: 'EXPENSE', category: 'Ocio', amount: 5 });
    await tx();
    expect(total(ctx, 'first_transaction')).toBe(1);
    await tx();
    await tx();
    await tx();
    expect(total(ctx, 'first_transaction')).toBe(1);
    await request(ctx.app)
      .put('/api/budgets')
      .set(user.auth)
      .send({ category: 'Ocio', amount: 100 })
      .expect(200);
    await request(ctx.app)
      .put('/api/budgets')
      .set(user.auth)
      .send({ category: 'Ocio', amount: 120 })
      .expect(200);
    await request(ctx.app)
      .post('/api/goals')
      .set(user.auth)
      .send({ name: 'Moto', target: 2000 })
      .expect(201);
    expect(total(ctx, 'activation_done')).toBe(0);
    await request(ctx.app)
      .post('/api/recurring-rules')
      .set(user.auth)
      .send({
        description: 'Alquiler',
        amount: 800,
        type: 'EXPENSE',
        category: 'Vivienda',
        startYear: 2026,
        startMonth: 3,
      })
      .expect(201);
    await request(ctx.app)
      .post('/api/goals')
      .set(user.auth)
      .send({ name: 'Viaje', target: 900 })
      .expect(201);
    expect(rows(ctx).filter((r) => r.event === 'activation_step')).toEqual(
      ['automations', 'budgets', 'goals', 'movements'].map((detail) => ({
        event: 'activation_step',
        source: '(unknown)',
        campaign: '',
        detail,
        count: 1,
      }))
    );
    expect(total(ctx, 'activation_done')).toBe(1);
  });

  it('counts the first movement of an import, but not of a preview', async () => {
    const ctx = createTestApp();
    const user = await createUser(ctx);
    const rowsToImport = [
      { date: '2026-03-01', description: 'Café', amount: -2 },
      { date: '2026-03-02', description: 'Pan', amount: -1 },
      { date: '2026-03-03', description: 'Bus', amount: -3 },
    ];
    const importRows = (dryRun: boolean) =>
      request(ctx.app)
        .post('/api/transactions/import')
        .set(user.auth)
        .send({ rows: rowsToImport, dryRun });
    await importRows(true).expect(200);
    expect(total(ctx, 'first_transaction')).toBe(0);
    await importRows(false).expect(201);
    expect(total(ctx, 'first_transaction')).toBe(1);
    expect(rows(ctx).find((r) => r.detail === 'movements')?.count).toBe(1);
  });

  it('counts payments started, purchases and cancellations (web)', async () => {
    const ctx = createTestApp();
    const user = await createUser(ctx);
    const webhook = (event: Record<string, unknown>) =>
      request(ctx.app)
        .post('/api/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'valid')
        .send(JSON.stringify({ id: `evt_${Math.random()}`, ...event }))
        .expect(200);
    const changed = (overrides: Record<string, unknown>) =>
      webhook({
        type: 'subscription_changed',
        userId: user.id,
        customerId: 'cus_1',
        subscriptionId: 'sub_1',
        status: 'active',
        currentPeriodEnd: '2026-04-15T12:00:00Z',
        cancelAtPeriodEnd: false,
        ...overrides,
      });
    await request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'monthly', acceptTerms: true, waiveWithdrawal: true })
      .expect(200);
    await webhook({ type: 'checkout_completed', userId: user.id, customerId: 'cus_1' });
    await changed({});
    expect(total(ctx, 'cancel')).toBe(0);
    await changed({ cancelAtPeriodEnd: true });
    // The same cancellation told again, then the end of the period: one cancellation.
    await changed({ cancelAtPeriodEnd: true });
    await changed({ status: 'canceled' });
    expect(total(ctx, 'checkout_start')).toBe(1);
    expect(total(ctx, 'premium')).toBe(1);
    expect(total(ctx, 'cancel')).toBe(1);

    // Cancelled at once, without scheduling it first.
    await changed({ subscriptionId: 'sub_1', status: 'active' });
    await changed({ status: 'canceled' });
    expect(total(ctx, 'cancel')).toBe(2);
  });

  it('counts cancellations in Google Play once, and not for lifetime purchases', async () => {
    const SECRET = 'revenuecat-shared-secret-123';
    const ctx = createTestApp({ env: { REVENUECAT_WEBHOOK_AUTH: SECRET } });
    const user = await createUser(ctx);
    expireTrial(ctx, user);
    let n = 0;
    const play = (type: string, product = 'premium_monthly:monthly') =>
      request(ctx.app)
        .post('/api/billing/play/webhook')
        .set('Authorization', SECRET)
        .send({
          event: {
            id: `rc_${++n}`,
            type,
            app_user_id: user.id,
            product_id: product,
            expiration_at_ms: ctx.clock.now().getTime() + 30 * 24 * 60 * 60 * 1000,
          },
        })
        .expect(200);
    await play('INITIAL_PURCHASE');
    await play('CANCELLATION');
    await play('CANCELLATION');
    expect(total(ctx, 'premium')).toBe(1);
    expect(total(ctx, 'cancel')).toBe(1);
    await play('NON_RENEWING_PURCHASE', 'premium_lifetime');
    await play('CANCELLATION', 'premium_lifetime');
    expect(total(ctx, 'cancel')).toBe(1);
  });
});

describe('Funnel storage', () => {
  const setup = (now = '2026-03-15T12:00:00Z') => {
    const db = openDatabase(':memory:');
    migrate(db, migrations);
    const clock = { now: () => new Date(now) };
    const logger = { warn: jest.fn() };
    return { db, repo: new SqliteFunnelRepository(db, clock, logger), logger };
  };

  it('caps the distinct rows of a day: the rest goes to (other)', () => {
    const { db, repo } = setup();
    const insert = db.prepare(
      "INSERT INTO funnel_daily (day, event, source, count) VALUES ('2026-03-15', 'visit', ?, 1)"
    );
    db.transaction(() => {
      for (let i = 0; i < MAX_ROWS_PER_DAY; i++) insert.run(`s${i}`);
    })();
    repo.record('visit', { source: 's1' });
    repo.record('visit', { source: 'new-one', campaign: 'c', detail: 'd' });
    repo.record('visit', { source: 'another' });
    const of = (source: string) =>
      (
        db.prepare('SELECT SUM(count) AS n FROM funnel_daily WHERE source = ?').get(source) as {
          n: number | null;
        }
      ).n;
    expect(of('s1')).toBe(2);
    expect(of('(other)')).toBe(2);
    expect(of('new-one')).toBeNull();
  });

  it('never throws when a counter cannot be written', () => {
    const { db, repo, logger } = setup();
    db.exec('DROP TABLE funnel_daily');
    expect(() => repo.record('visit')).not.toThrow();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[funnel] could not count'));
  });

  it('deletes the days past the retention period (25 months)', () => {
    const { db, repo } = setup('2028-04-15T12:00:00Z');
    const insert = db.prepare(
      "INSERT INTO funnel_daily (day, event, source, count) VALUES (?, 'visit', '(direct)', 1)"
    );
    insert.run('2026-03-14');
    insert.run('2026-03-15');
    insert.run('2028-04-15');
    expect(repo.purgeExpired()).toBe(1);
    expect(repo.rows('2000-01-01', '2100-01-01').map((r) => r.day)).toEqual([
      '2026-03-15',
      '2028-04-15',
    ]);
  });

  it('activation tracker ignores steps that were already done', () => {
    const funnel = { record: jest.fn() };
    const tracker = new ActivationTracker(funnel, () => 5);
    tracker.after('u', 'movements', 4);
    expect(funnel.record).not.toHaveBeenCalled();
  });
});

describe('Funnel report', () => {
  it('prints totals with conversions, origins, campaigns, guides and days', async () => {
    const ctx = createTestApp();
    for (let i = 0; i < 4; i++) {
      await send(ctx, { event: 'visit', utm_source: 'tiktok', utm_campaign: 'renta2026' });
    }
    await send(ctx, { event: 'visit', ref: 'www.google.es' });
    await send(ctx, { event: 'guide_view', guide: 'modelo-303', ref: 'www.google.es' });
    await send(ctx, { event: 'guide_cta_click', guide: 'modelo-303', ref: 'www.google.es' });
    await send(ctx, { event: 'signup_view', utm_source: 'tiktok' });
    await request(ctx.app)
      .post('/api/auth/register')
      .send({
        email: 'r@example.com',
        password: STRONG_PASSWORD,
        name: 'R',
        origin: { utm_source: 'tiktok', utm_campaign: 'renta2026' },
      })
      .expect(201);
    ctx.container.repos.funnel.record('activation_step', { detail: 'movements' });
    ctx.clock.set('2026-03-16T09:00:00Z');
    await send(ctx, { event: 'visit' });

    const text = formatFunnel(ctx.container.repos.funnel, 30, new Date('2026-03-20T10:00:00Z'));
    const line = (start: string) => text.split('\n').find((l) => l.startsWith(start));
    expect(text.split('\n')[0]).toBe('Embudo anónimo · 2026-02-19 → 2026-03-20');
    expect(line('Visitas (cargas de la web)')).toMatch(/6$/);
    expect(line('Vistas de la página de registro')).toMatch(/1\s+16\.7 %$/);
    expect(line('Registros')).toMatch(/1\s+100\.0 %$/);
    expect(line('Primer movimiento')).toMatch(/0\s+0\.0 %$/);
    expect(line('Pagos iniciados')).toMatch(/0\s+—$/);
    expect(line('tiktok')).toMatch(/^tiktok\s+4\s+0\s+1\s+1\s+25\.0 %$/);
    expect(line('google')).toMatch(/^google\s+1\s+1\s+0\s+0\s+0\.0 %$/);
    expect(line('tiktok · renta2026')).toMatch(/4\s+1\s+25\.0 %$/);
    expect(line('modelo-303')).toMatch(/1\s+1\s+100\.0 %$/);
    expect(line('2026-03-15')).toMatch(/^2026-03-15\s+5\s+1/);
    expect(line('2026-03-16')).toMatch(/^2026-03-16\s+1\s+0/);
    expect(line('  3 movimientos')).toMatch(/1$/);
    expect(line('  1 meta')).toMatch(/0$/);

    expect(formatFunnel(ctx.container.repos.funnel, 1, new Date('2027-01-01T00:00:00Z'))).toBe(
      'Embudo anónimo · 2027-01-01 → 2027-01-01\n(sin datos)'
    );
  });

  it('leaves out the campaign and guide tables when there are none', async () => {
    const ctx = createTestApp();
    await send(ctx, { event: 'visit' });
    const text = formatFunnel(ctx.container.repos.funnel, 7, new Date('2026-03-15T12:00:00Z'));
    expect(text).not.toContain('Campaña');
    expect(text).not.toContain('Guía');
    expect(text).toContain('(direct)');
  });
});
