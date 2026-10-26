import request from 'supertest';
import { SAMPLE_MONTHS, sampleMovements } from '@domain/services/sample-data';
import {
  TestContext,
  TestUser,
  addTransaction,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

describe('sampleMovements', () => {
  it('invents four months up to today, with a price rise and a double charge', () => {
    const all = sampleMovements('2026-10-26');
    expect(all[0].date).toBe('2026-07-01');
    expect(all[all.length - 1].date <= '2026-10-26').toBe(true);
    expect(all.some((m) => m.date > '2026-10-26')).toBe(false);
    const music = all.filter((m) => m.description === 'MÚSICA EN STREAMING');
    expect(music.map((m) => m.amountCents)).toEqual([1099, 1099, 1099, 1199]);
    expect(all.filter((m) => m.description === 'TIENDA ONLINE BAZAR')).toHaveLength(2);
    expect(new Set(all.map((m) => m.date.slice(0, 7))).size).toBe(SAMPLE_MONTHS);
    // Across a new year too.
    expect(sampleMovements('2027-01-31')[0].date).toBe('2026-10-01');
  });
});

describe('Sample data', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-10-26T12:00:00Z' });
    user = await createUser(ctx);
  });

  const status = async () =>
    (await request(ctx.app).get('/api/sample-data').set(user.auth).expect(200)).body;

  it('adds the invented movements once, shows what they find and removes only them', async () => {
    expireTrial(ctx, user);
    expect(await status()).toEqual({ sample: 0, movements: 0 });
    await addTransaction(ctx, user, { description: 'Mi compra', date: '2026-10-20' });
    const loaded = (await request(ctx.app).post('/api/sample-data').set(user.auth).expect(201))
      .body;
    const count = sampleMovements('2026-10-26').length;
    expect(loaded).toEqual({ sample: count, movements: count + 1 });
    // Again: nothing is added twice.
    await request(ctx.app).post('/api/sample-data').set(user.auth).expect(201);
    expect(await status()).toEqual({ sample: count, movements: count + 1 });

    const leaks = (await request(ctx.app).get('/api/stats/money-leaks').set(user.auth)).body;
    expect(leaks.coverage.level).toBe('complete');
    expect(leaks.total.count).toBeGreaterThan(0);
    const subscriptions = (await request(ctx.app).get('/api/stats/subscriptions').set(user.auth))
      .body;
    expect(subscriptions.count).toBeGreaterThan(subscriptions.fixed);
    // The rent, the power bill and the home insurance.
    expect(subscriptions.fixed).toBe(3);

    const removed = await request(ctx.app).delete('/api/sample-data').set(user.auth).expect(200);
    expect(removed.body).toEqual({ deleted: count });
    expect(await status()).toEqual({ sample: 0, movements: 1 });
  });

  it('needs a session', async () => {
    await request(ctx.app).get('/api/sample-data').expect(401);
  });
});
