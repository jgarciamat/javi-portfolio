import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser, expireTrial } from '../helpers/testApp';

describe('Premium videos of the Videoteca', () => {
  let ctx: TestContext;
  let user: TestUser;

  const get = (auth?: { Authorization: string }) => {
    const req = request(ctx.app).get('/api/videos/premium');
    return auth ? req.set(auth) : req;
  };

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  it('gives the YouTube ids to Premium users (the trial included), never cached', async () => {
    const res = await get(user.auth).expect(200);
    expect(res.body).toEqual({
      '17': 'I6XofjXihyA',
      '18': '5D9_c2lZJmo',
      '19': 'Ke11Uw8OCe4',
      '20': 'FFNWp0s6SD4',
      '27': 'XMyY6z7269s',
      '28': '097frSE3Hac',
      '29': 'xA1dbQuHuSQ',
    });
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('refuses free users with a 403 (not the paywall) and without any id', async () => {
    expireTrial(ctx, user);
    const res = await get(user.auth).expect(403);
    expect(res.body).toMatchObject({ code: 'PREMIUM_REQUIRED' });
    expect(JSON.stringify(res.body)).not.toMatch(/I6XofjXihyA/);
  });

  it('needs a session', async () => {
    const res = await get().expect(401);
    expect(res.body.code).toBe('TOKEN_REQUIRED');
    await get({ Authorization: 'Bearer nope' }).expect(401);
  });

  it('follows the plan of the household owner', async () => {
    const member = await createUser(ctx);
    expireTrial(ctx, member);
    await get(member.auth).expect(403);
    ctx.container.repos.household.addMember(member.id, user.id, '2026-03-15T12:00:00.000Z');
    await get(member.auth).expect(200);
    expireTrial(ctx, user);
    await get(member.auth).expect(403);
  });
});
