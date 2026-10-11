import request from 'supertest';
import { BusinessRuleError } from '@domain/errors';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

describe('Exchange rates', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  it('gives the reference rate between two currencies', async () => {
    const res = await request(ctx.app).get('/api/rates?from=usd&to=eur').set(user.auth).expect(200);
    expect(res.body).toEqual({ from: 'USD', to: 'EUR', rate: 0.9 });
  });

  it('needs a session and two currency codes', async () => {
    await request(ctx.app).get('/api/rates?from=USD&to=EUR').expect(401);
    await request(ctx.app).get('/api/rates?from=US&to=EUR').set(user.auth).expect(400);
    await request(ctx.app).get('/api/rates').set(user.auth).expect(400);
  });

  it('tells the user to type the rate when the service is down', async () => {
    ctx = createTestApp({
      rates: {
        rate: async () => {
          throw new BusinessRuleError(
            'RATES_UNAVAILABLE',
            'No hemos podido obtener el tipo de cambio'
          );
        },
      },
    });
    user = await createUser(ctx);
    const res = await request(ctx.app).get('/api/rates?from=USD&to=EUR').set(user.auth).expect(400);
    expect(res.body.code).toBe('RATES_UNAVAILABLE');
  });
});
