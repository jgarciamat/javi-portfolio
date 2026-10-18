import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser, expireTrial } from '../helpers/testApp';

describe('Income tax return calculations', () => {
  let ctx: TestContext;
  let user: TestUser;

  const calculate = () => request(ctx.app).post('/api/renta/calculation').set(user.auth);
  const billing = async () =>
    (await request(ctx.app).get('/api/billing').set(user.auth).expect(200)).body;

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-03-15T12:00:00Z' });
    user = await createUser(ctx);
  });

  it('has no limit while the user has Premium (trial)', async () => {
    for (let i = 1; i <= 3; i++) {
      expect((await calculate().expect(201)).body).toEqual({ used: i });
    }
    const overview = await billing();
    expect(overview.usage.rentaCalculations).toBe(3);
    expect(overview.limits.resources.rentaCalculations).toBeNull();
  });

  it('gives the free plan three calculations per campaign, again in the next one', async () => {
    expireTrial(ctx, user);
    expect((await billing()).limits.resources.rentaCalculations).toBe(3);
    for (let i = 1; i <= 3; i++) {
      expect((await calculate().expect(201)).body).toEqual({ used: i });
    }
    const refused = await calculate().expect(402);
    expect(refused.body.code).toBe('PLAN_LIMIT');
    expect(refused.body.details).toEqual({ resource: 'rentaCalculations', limit: 3 });
    expect((await billing()).usage.rentaCalculations).toBe(3);
    // Still the same campaign at the end of March; a new one from April.
    ctx.clock.set('2026-03-31T20:00:00Z');
    await calculate().expect(402);
    ctx.clock.set('2026-04-01T08:00:00Z');
    expect((await billing()).usage.rentaCalculations).toBe(0);
    expect((await calculate().expect(201)).body).toEqual({ used: 1 });
  });

  it('counts each user on their own and needs a session', async () => {
    expireTrial(ctx, user);
    await calculate().expect(201);
    const other = await createUser(ctx, 'otra@example.com');
    expireTrial(ctx, other);
    await request(ctx.app).post('/api/renta/calculation').set(other.auth).expect(201);
    await request(ctx.app).post('/api/renta/calculation').expect(401);
  });
});
