import request from 'supertest';
import { SubscriptionProps } from '@domain/model/Subscription';
import {
  STRONG_PASSWORD,
  TestContext,
  TestUser,
  createTestApp,
  createUser,
} from '../helpers/testApp';

describe('Deleting the account', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  const remove = (auth: { Authorization: string }, body: Record<string, unknown> = {}) =>
    request(ctx.app).delete('/api/profile/account').set(auth).send(body);
  const exists = (id: string) => ctx.container.repos.users.findById(id) !== null;

  const googleUser = async (token: string, googleId: string) => {
    ctx.google.identities.set(token, {
      googleId,
      email: `${googleId}@gmail.com`,
      emailVerified: true,
      name: 'Gina',
    });
    const res = await request(ctx.app).post('/api/auth/google').send({ token }).expect(200);
    return {
      id: res.body.user.id as string,
      refreshToken: res.body.refreshToken as string,
      auth: { Authorization: `Bearer ${res.body.accessToken}` },
    };
  };

  describe('re-authentication', () => {
    it('asks a password account for its current password (403, so the app stays signed in)', async () => {
      const user = await createUser(ctx);
      const missing = await remove(user.auth).expect(403);
      expect(missing.body.code).toBe('WRONG_PASSWORD');
      expect((await remove(user.auth, { password: 'Wrong-pass1!' }).expect(403)).body.code).toBe(
        'WRONG_PASSWORD'
      );
      expect(exists(user.id)).toBe(true);
      await remove(user.auth, { password: STRONG_PASSWORD }).expect(204);
      expect(exists(user.id)).toBe(false);
    });

    it('lets a Google-only account delete within 10 minutes of signing in', async () => {
      const user = await googleUser('fresh', 'g-fresh');
      ctx.clock.set('2026-03-15T12:09:00Z');
      await remove(user.auth).expect(204);
      expect(exists(user.id)).toBe(false);
    });

    it('asks a Google-only account to sign in again later, even after refreshing', async () => {
      const user = await googleUser('old', 'g-old');
      await googleUser('someone-else', 'g-other');
      ctx.clock.set('2026-03-15T12:20:00Z');
      // A refreshed access token keeps the time of the original sign-in.
      const refreshed = await request(ctx.app)
        .post('/api/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(200);
      const auth = { Authorization: `Bearer ${refreshed.body.accessToken}` };
      const stale = await remove(auth).expect(403);
      expect(stale.body.code).toBe('REAUTH_REQUIRED');
      // A Google credential of another account or a forged one is not enough.
      await remove(auth, { googleToken: 'someone-else' }).expect(403);
      await remove(auth, { googleToken: 'forged' }).expect(403);
      expect(exists(user.id)).toBe(true);
      // A fresh Google credential of the same account is.
      await remove(auth, { googleToken: 'old' }).expect(204);
      expect(exists(user.id)).toBe(false);
    });

    it('treats access tokens issued before this check as an old sign-in', async () => {
      const user = await googleUser('legacy', 'g-legacy');
      const legacy = ctx.container.auth;
      jest.spyOn(legacy, 'authenticate').mockReturnValueOnce({ userId: user.id, authTime: null });
      expect((await remove(user.auth).expect(403)).body.code).toBe('REAUTH_REQUIRED');
    });

    it('asks for a recent Google sign-in before a Google-only account sets its first password', async () => {
      const user = await googleUser('pw', 'g-pw');
      ctx.clock.set('2026-03-15T12:30:00Z');
      const stale = await request(ctx.app)
        .patch('/api/profile/password')
        .set(user.auth)
        .send({ newPassword: STRONG_PASSWORD })
        .expect(403);
      expect(stale.body.code).toBe('REAUTH_REQUIRED');
      const again = await googleUser('pw', 'g-pw');
      await request(ctx.app)
        .patch('/api/profile/password')
        .set(again.auth)
        .send({ newPassword: STRONG_PASSWORD })
        .expect(200);
    });
  });

  describe('Google Play subscription', () => {
    let user: TestUser;
    const subscribeInPlay = (changes: Partial<SubscriptionProps> = {}) => {
      const sub = ctx.container.repos.subscriptions.get(user.id)!;
      ctx.container.repos.subscriptions.save({
        ...sub,
        source: 'google',
        status: 'active',
        trialEndsAt: null,
        currentPeriodEnd: '2026-04-15T12:00:00.000Z',
        ...changes,
      });
    };

    beforeEach(async () => {
      user = await createUser(ctx);
    });

    it('refuses until the user confirms having cancelled it in Google Play', async () => {
      subscribeInPlay();
      const res = await remove(user.auth, { password: STRONG_PASSWORD }).expect(409);
      expect(res.body).toMatchObject({
        code: 'PLAY_SUBSCRIPTION_ACTIVE',
        error: expect.stringContaining('cancélala en Google Play o seguirá cobrándose'),
        details: { manageUrl: 'https://play.google.com/store/account/subscriptions' },
      });
      expect(exists(user.id)).toBe(true);
      // The password is still checked first.
      await remove(user.auth, { confirmPlayCancelled: true }).expect(403);
      await remove(user.auth, { password: STRONG_PASSWORD, confirmPlayCancelled: true }).expect(
        204
      );
      expect(exists(user.id)).toBe(false);
      expect(ctx.payments.cancelled).toEqual([]);
    });

    it('needs no confirmation once it no longer renews, or for a lifetime purchase', async () => {
      subscribeInPlay({ cancelAtPeriodEnd: true });
      await remove(user.auth, { password: STRONG_PASSWORD }).expect(204);
      user = await createUser(ctx);
      subscribeInPlay({ lifetime: true });
      await remove(user.auth, { password: STRONG_PASSWORD }).expect(204);
      user = await createUser(ctx);
      subscribeInPlay({ status: 'canceled' });
      await remove(user.auth, { password: STRONG_PASSWORD }).expect(204);
    });
  });
});
