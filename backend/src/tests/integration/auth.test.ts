import request from 'supertest';
import { STRONG_PASSWORD, TestContext, createTestApp, createUser } from '../helpers/testApp';

describe('Auth API', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  const lastToken = (kind: 'verify' | 'reset', email: string): string =>
    [...ctx.email.sent].reverse().find((s) => s.kind === kind && s.to === email)!.token;

  describe('register', () => {
    it('rejects weak passwords with WEAK_PASSWORD', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/register')
        .send({ email: 'a@example.com', password: 'abc', name: 'A' })
        .expect(400);
      expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    it('creates the user with default categories, account and settings', async () => {
      const user = await createUser(ctx, 'new@example.com');
      const categories = await request(ctx.app).get('/api/categories').set(user.auth).expect(200);
      expect(categories.body.length).toBeGreaterThanOrEqual(18);
      const accounts = await request(ctx.app).get('/api/accounts').set(user.auth).expect(200);
      expect(accounts.body.accounts).toHaveLength(1);
      expect(accounts.body.accounts[0].isDefault).toBe(true);
    });

    it('rejects a duplicated e-mail with EMAIL_TAKEN', async () => {
      await createUser(ctx, 'dup@example.com');
      const res = await request(ctx.app)
        .post('/api/auth/register')
        .send({ email: 'DUP@example.com', password: STRONG_PASSWORD, name: 'B' })
        .expect(409);
      expect(res.body.code).toBe('EMAIL_TAKEN');
    });
  });

  describe('login', () => {
    it('requires a verified e-mail', async () => {
      await request(ctx.app)
        .post('/api/auth/register')
        .send({ email: 'pending@example.com', password: STRONG_PASSWORD, name: 'P' })
        .expect(201);
      const res = await request(ctx.app)
        .post('/api/auth/login')
        .send({ email: 'pending@example.com', password: STRONG_PASSWORD })
        .expect(403);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('answers the same for unknown e-mail and wrong password', async () => {
      await createUser(ctx, 'known@example.com');
      const wrong = await request(ctx.app)
        .post('/api/auth/login')
        .send({ email: 'known@example.com', password: 'Wrong-pass1!' })
        .expect(401);
      const unknown = await request(ctx.app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'Wrong-pass1!' })
        .expect(401);
      expect(wrong.body).toEqual(unknown.body);
      expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects requests without or with a forged token', async () => {
      await request(ctx.app).get('/api/categories').expect(401);
      const res = await request(ctx.app)
        .get('/api/categories')
        .set('Authorization', 'Bearer not.a.jwt')
        .expect(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('verification e-mail', () => {
    it('expires after 24 hours and can be resent', async () => {
      await request(ctx.app)
        .post('/api/auth/register')
        .send({ email: 'late@example.com', password: STRONG_PASSWORD, name: 'L' })
        .expect(201);
      const token = lastToken('verify', 'late@example.com');
      ctx.clock.set('2026-03-17T12:00:00Z');
      const expired = await request(ctx.app)
        .get('/api/auth/verify-email')
        .query({ token })
        .expect(400);
      expect(expired.body.code).toBe('TOKEN_EXPIRED');

      await request(ctx.app)
        .post('/api/auth/resend-verification')
        .send({ email: 'late@example.com' })
        .expect(200);
      await request(ctx.app)
        .get('/api/auth/verify-email')
        .query({ token: lastToken('verify', 'late@example.com') })
        .expect(200);
    });

    it('does not reveal whether the e-mail exists when resending', async () => {
      const res = await request(ctx.app)
        .post('/api/auth/resend-verification')
        .send({ email: 'ghost@example.com' })
        .expect(200);
      expect(res.body.message).toBeDefined();
      expect(ctx.email.sent.filter((s) => s.to === 'ghost@example.com')).toHaveLength(0);
    });
  });

  describe('sessions', () => {
    it('refreshes the access token and logout revokes the refresh token', async () => {
      const user = await createUser(ctx);
      const refreshed = await request(ctx.app)
        .post('/api/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(200);
      await request(ctx.app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
        .expect(200);

      await request(ctx.app)
        .post('/api/auth/logout')
        .send({ refreshToken: user.refreshToken })
        .expect(204);
      const res = await request(ctx.app)
        .post('/api/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(401);
      expect(res.body.code).toBe('SESSION_EXPIRED');
    });

    it('logout-all invalidates every access and refresh token immediately', async () => {
      const user = await createUser(ctx);
      await request(ctx.app).post('/api/auth/logout-all').set(user.auth).expect(204);
      await request(ctx.app).get('/api/categories').set(user.auth).expect(401);
      await request(ctx.app)
        .post('/api/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(401);
    });

    it('a deleted account cannot keep using its tokens', async () => {
      const user = await createUser(ctx);
      await request(ctx.app).delete('/api/profile/account').set(user.auth).expect(204);
      await request(ctx.app).get('/api/categories').set(user.auth).expect(401);
    });
  });

  describe('password reset', () => {
    it('always answers 200 and only e-mails existing users', async () => {
      await request(ctx.app)
        .post('/api/auth/forgot-password')
        .send({ email: 'none@example.com' })
        .expect(200);
      expect(ctx.email.sent.filter((s) => s.kind === 'reset')).toHaveLength(0);
    });

    it('can be requested again after the previous link expired (old bug)', async () => {
      const user = await createUser(ctx);
      await request(ctx.app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);
      ctx.clock.set('2026-03-15T14:00:00Z');
      await request(ctx.app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);
      expect(ctx.email.sent.filter((s) => s.kind === 'reset' && s.to === user.email)).toHaveLength(
        2
      );
    });

    it('resets the password, validates its strength and closes every session', async () => {
      const user = await createUser(ctx);
      await request(ctx.app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);
      const token = lastToken('reset', user.email);

      const weak = await request(ctx.app)
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'weak' })
        .expect(400);
      expect(weak.body.code).toBe('WEAK_PASSWORD');

      await request(ctx.app)
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'N3w-password!' })
        .expect(200);
      await request(ctx.app).get('/api/categories').set(user.auth).expect(401);
      await request(ctx.app)
        .post('/api/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(401);
      await request(ctx.app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'N3w-password!' })
        .expect(200);
      await request(ctx.app)
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'An0ther-pass!' })
        .expect(400);
    });
  });

  describe('profile password change', () => {
    it('returns new tokens and invalidates the old ones', async () => {
      const user = await createUser(ctx);
      const res = await request(ctx.app)
        .patch('/api/profile/password')
        .set(user.auth)
        .send({ currentPassword: STRONG_PASSWORD, newPassword: 'Other-pass9!' })
        .expect(200);
      await request(ctx.app).get('/api/categories').set(user.auth).expect(401);
      await request(ctx.app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(200);
    });

    it('rejects a wrong current password', async () => {
      const user = await createUser(ctx);
      const res = await request(ctx.app)
        .patch('/api/profile/password')
        .set(user.auth)
        .send({ currentPassword: 'nope', newPassword: 'Other-pass9!' })
        .expect(401);
      expect(res.body.code).toBe('WRONG_PASSWORD');
    });
  });

  describe('Google', () => {
    it('creates a verified account for a new Google user', async () => {
      ctx.google.identities.set('good', {
        googleId: 'g-1',
        email: 'gina@gmail.com',
        emailVerified: true,
        name: 'Gina',
      });
      const res = await request(ctx.app)
        .post('/api/auth/google')
        .send({ token: 'good' })
        .expect(200);
      expect(res.body.user.email).toBe('gina@gmail.com');
      expect(res.body.user.hasPassword).toBe(false);
    });

    it('rejects tokens the verifier does not accept and unverified Google e-mails', async () => {
      await request(ctx.app).post('/api/auth/google').send({ token: 'forged' }).expect(401);
      ctx.google.identities.set('unverified', {
        googleId: 'g-2',
        email: 'x@gmail.com',
        emailVerified: false,
        name: null,
      });
      const res = await request(ctx.app)
        .post('/api/auth/google')
        .send({ token: 'unverified' })
        .expect(401);
      expect(res.body.code).toBe('GOOGLE_EMAIL_NOT_VERIFIED');
    });

    it('drops a password registered by someone else before linking (pre-account takeover)', async () => {
      // An attacker registers the victim's address but never verifies it.
      await request(ctx.app)
        .post('/api/auth/register')
        .send({ email: 'victim@gmail.com', password: STRONG_PASSWORD, name: 'Attacker' })
        .expect(201);
      ctx.google.identities.set('victim', {
        googleId: 'g-victim',
        email: 'victim@gmail.com',
        emailVerified: true,
        name: 'Victim',
      });
      await request(ctx.app).post('/api/auth/google').send({ token: 'victim' }).expect(200);
      const attacker = await request(ctx.app)
        .post('/api/auth/login')
        .send({ email: 'victim@gmail.com', password: STRONG_PASSWORD })
        .expect(401);
      expect(attacker.body.code).toBe('INVALID_CREDENTIALS');
    });
  });
});
