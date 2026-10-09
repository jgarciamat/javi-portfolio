import request from 'supertest';
import { FinancialAdvisor } from '@domain/ports/services';
import { formatStats } from '@infrastructure/sqlite/stats';
import { TestContext, addTransaction, createTestApp, createUser } from '../helpers/testApp';

const totals = (ctx: TestContext) =>
  Object.fromEntries(
    ctx.container.repos.metrics.totals('2026-03-01', '2026-03-31').map((r) => [r.name, r.count])
  );

describe('Anonymous product counters', () => {
  it('counts signups and verified emails without keeping anything about the user', async () => {
    const ctx = createTestApp();
    await createUser(ctx);
    await createUser(ctx);
    expect(totals(ctx)).toEqual({ signup: 2, email_verified: 2 });
    const rows = ctx.container.db.prepare('SELECT * FROM metrics ORDER BY name').all() as Record<
      string,
      unknown
    >[];
    expect(rows).toEqual([
      { day: '2026-03-15', name: 'email_verified', count: 2 },
      { day: '2026-03-15', name: 'signup', count: 2 },
    ]);
  });

  it('counts payments started, confirmed purchases and real imports (not previews)', async () => {
    const ctx = createTestApp();
    const user = await createUser(ctx);
    await request(ctx.app)
      .post('/api/billing/checkout')
      .set(user.auth)
      .send({ kind: 'monthly', acceptTerms: true, waiveWithdrawal: true })
      .expect(200);
    await request(ctx.app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'valid')
      .send(
        JSON.stringify({
          id: 'evt_1',
          type: 'checkout_completed',
          userId: user.id,
          customerId: 'c',
        })
      )
      .expect(200);
    const rows = [{ date: '2026-03-01', description: 'Café', amount: -2 }];
    await request(ctx.app)
      .post('/api/transactions/import')
      .set(user.auth)
      .send({ rows, dryRun: true })
      .expect(200);
    await request(ctx.app)
      .post('/api/transactions/import')
      .set(user.auth)
      .send({ rows, dryRun: false })
      .expect(201);
    expect(totals(ctx)).toMatchObject({ checkout_started: 1, purchase: 1, import_done: 1 });
  });

  it('counts the analyses answered by the AI, not the ones from rules', async () => {
    const advisor: FinancialAdvisor = {
      name: 'fake',
      getAdvice: jest.fn().mockResolvedValue({
        advice: { summary: 'IA', tips: [], positives: [], warnings: [] },
        usage: { neurons: 20 },
      }),
    };
    const ctx = createTestApp({ advisor });
    const user = await createUser(ctx);
    await addTransaction(ctx, user, { type: 'INCOME', category: 'Salario', amount: 1000 });
    await request(ctx.app)
      .post('/api/ai/advice')
      .set(user.auth)
      .send({ year: 2026, month: 3 })
      .expect(200);
    const noAi = createTestApp();
    const other = await createUser(noAi);
    await request(noAi.app)
      .post('/api/ai/advice')
      .set(other.auth)
      .send({ year: 2026, month: 3 })
      .expect(200);
    expect(totals(ctx).ai_analysis).toBe(1);
    expect(totals(noAi).ai_analysis).toBeUndefined();
  });

  it('prints the counters of the last days', async () => {
    const ctx = createTestApp();
    await createUser(ctx);
    const text = formatStats(ctx.container.repos.metrics, 30, new Date('2026-03-20T10:00:00Z'));
    expect(text).toBe(
      [
        'Contadores anónimos · 2026-02-19 → 2026-03-20',
        `${'Emails verificados'.padEnd(28)}1`,
        `${'Registros'.padEnd(28)}1`,
      ].join('\n')
    );
    expect(formatStats(ctx.container.repos.metrics, 1, new Date('2026-05-01T00:00:00Z'))).toBe(
      'Contadores anónimos · 2026-05-01 → 2026-05-01\n(sin datos)'
    );
  });
});
