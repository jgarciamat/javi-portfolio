import request from 'supertest';
import { totpCode } from '@domain/services/totp';
import { LOCK_MS } from '@application/auth/TwoFactorService';
import {
  STRONG_PASSWORD,
  TestContext,
  TestUser,
  createTestApp,
  createUser,
} from '../helpers/testApp';

describe('Two-factor authentication', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx, 'ana@example.com');
  });

  const code = (secret: string): string => totpCode(secret, ctx.clock.now().getTime());
  /** Moves to the next 30-second step, so a new code is accepted. */
  const nextStep = (): void =>
    ctx.clock.set(new Date(ctx.clock.now().getTime() + 30_000).toISOString());
  const notices = () =>
    ctx.email.sent.filter((s) => s.kind === 'security').map((s) => [s.to, s.notice]);
  const flush = () => new Promise((r) => setImmediate(r));

  const setup = (auth = user.auth, body: object = { password: STRONG_PASSWORD }) =>
    request(ctx.app).post('/api/auth/2fa/setup').set(auth).send(body);

  /** Turns 2FA on for `user`; returns the secret and the recovery codes. */
  async function enable(): Promise<{ secret: string; recoveryCodes: string[] }> {
    const { body } = await setup().expect(200);
    const res = await request(ctx.app)
      .post('/api/auth/2fa/enable')
      .set(user.auth)
      .send({ code: code(body.secret) })
      .expect(200);
    nextStep();
    return { secret: body.secret, recoveryCodes: res.body.recoveryCodes };
  }

  const login = () =>
    request(ctx.app).post('/api/auth/login').send({ email: user.email, password: STRONG_PASSWORD });
  const verify = (challengeToken: string, value: string) =>
    request(ctx.app).post('/api/auth/2fa/verify').send({ challengeToken, code: value });

  describe('enrolment', () => {
    it('is off by default and needs a session', async () => {
      await request(ctx.app).get('/api/auth/2fa').expect(401);
      const res = await request(ctx.app).get('/api/auth/2fa').set(user.auth).expect(200);
      expect(res.body).toEqual({ enabled: false, enabledAt: null, recoveryCodesRemaining: 0 });
    });

    it('asks for the password before showing a secret', async () => {
      expect((await setup(user.auth, {}).expect(403)).body.code).toBe('WRONG_PASSWORD');
      expect((await setup(user.auth, { password: 'nope' }).expect(403)).body.code).toBe(
        'WRONG_PASSWORD'
      );
    });

    it('stores the secret encrypted and turns on with a valid code', async () => {
      const { body } = await setup().expect(200);
      expect(body.secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(body.otpauthUri).toBe(
        `otpauth://totp/Finanverso%3Aana%40example.com?secret=${body.secret}&issuer=Finanverso&algorithm=SHA1&digits=6&period=30`
      );
      const row = ctx.container.db
        .prepare('SELECT secret_enc, enabled_at FROM user_two_factor WHERE user_id = ?')
        .get(user.id) as { secret_enc: string; enabled_at: string | null };
      expect(row.secret_enc).not.toContain(body.secret);
      expect(row.enabled_at).toBeNull();
      // Pending: signing in does not ask for a code yet.
      expect((await login().expect(200)).body.accessToken).toEqual(expect.any(String));

      const wrong = await request(ctx.app)
        .post('/api/auth/2fa/enable')
        .set(user.auth)
        .send({ code: '000000' })
        .expect(403);
      expect(wrong.body.code).toBe('INVALID_TWO_FACTOR_CODE');

      const res = await request(ctx.app)
        .post('/api/auth/2fa/enable')
        .set(user.auth)
        .send({ code: code(body.secret) })
        .expect(200);
      expect(res.body.recoveryCodes).toHaveLength(10);
      expect(new Set(res.body.recoveryCodes).size).toBe(10);
      // Only hashes are kept.
      const hashes = ctx.container.db
        .prepare('SELECT code_hash FROM two_factor_recovery_codes WHERE user_id = ?')
        .all(user.id) as { code_hash: string }[];
      expect(hashes).toHaveLength(10);
      expect(hashes.map((h) => h.code_hash)).not.toContain(res.body.recoveryCodes[0]);

      const status = await request(ctx.app).get('/api/auth/2fa').set(user.auth).expect(200);
      expect(status.body).toEqual({
        enabled: true,
        enabledAt: '2026-03-15T12:00:00.000Z',
        recoveryCodesRemaining: 10,
      });
      await flush();
      expect(notices()).toEqual([['ana@example.com', 'two_factor_enabled']]);

      // Already on: neither a new secret nor a second confirmation.
      expect((await setup().expect(409)).body.code).toBe('TWO_FACTOR_ALREADY_ENABLED');
      const again = await request(ctx.app)
        .post('/api/auth/2fa/enable')
        .set(user.auth)
        .send({ code: code(body.secret) })
        .expect(409);
      expect(again.body.code).toBe('TWO_FACTOR_ALREADY_ENABLED');
    });

    it('expires an enrolment that was not confirmed in time', async () => {
      const none = await request(ctx.app)
        .post('/api/auth/2fa/enable')
        .set(user.auth)
        .send({ code: '123456' })
        .expect(400);
      expect(none.body.code).toBe('TWO_FACTOR_SETUP_EXPIRED');
      const { body } = await setup().expect(200);
      ctx.clock.set('2026-03-15T12:16:00Z');
      const res = await request(ctx.app)
        .post('/api/auth/2fa/enable')
        .set(user.auth)
        .send({ code: code(body.secret) })
        .expect(400);
      expect(res.body.code).toBe('TWO_FACTOR_SETUP_EXPIRED');
    });

    it('validates the body', async () => {
      await request(ctx.app).post('/api/auth/2fa/enable').set(user.auth).send({}).expect(400);
      await request(ctx.app).post('/api/auth/2fa/verify').send({ code: '1' }).expect(400);
    });
  });

  describe('sign-in', () => {
    it('asks for the code after the password and opens the session with it', async () => {
      const { secret } = await enable();
      const first = await login().expect(200);
      expect(first.body).toEqual({
        twoFactorRequired: true,
        challengeToken: expect.any(String),
        expiresAt: '2026-03-15T12:05:30.000Z',
      });
      expect(first.body.accessToken).toBeUndefined();

      const wrong = await verify(first.body.challengeToken, '000000').expect(403);
      expect(wrong.body.code).toBe('INVALID_TWO_FACTOR_CODE');

      const ok = await verify(first.body.challengeToken, code(secret)).expect(200);
      expect(ok.body.user).toMatchObject({ id: user.id, email: 'ana@example.com' });
      await request(ctx.app)
        .get('/api/profile')
        .set({ Authorization: `Bearer ${ok.body.accessToken}` })
        .expect(200);
      await request(ctx.app)
        .post('/api/auth/refresh')
        .send({ refreshToken: ok.body.refreshToken })
        .expect(200);

      // The challenge works once.
      const reused = await verify(first.body.challengeToken, code(secret)).expect(401);
      expect(reused.body.code).toBe('TWO_FACTOR_CHALLENGE_EXPIRED');
    });

    it('refuses a code that was already used (replay), even on a new challenge', async () => {
      const { secret } = await enable();
      const used = code(secret);
      const a = await login().expect(200);
      await verify(a.body.challengeToken, used).expect(200);
      const b = await login().expect(200);
      expect((await verify(b.body.challengeToken, used).expect(403)).body.code).toBe(
        'INVALID_TWO_FACTOR_CODE'
      );
      nextStep();
      await verify(b.body.challengeToken, code(secret)).expect(200);
    });

    it('expires the challenge after five minutes', async () => {
      const { secret } = await enable();
      const { body } = await login().expect(200);
      ctx.clock.set('2026-03-15T12:06:00Z');
      expect((await verify(body.challengeToken, code(secret)).expect(401)).body.code).toBe(
        'TWO_FACTOR_CHALLENGE_EXPIRED'
      );
      expect((await verify('made-up', code(secret)).expect(401)).body.code).toBe(
        'TWO_FACTOR_CHALLENGE_EXPIRED'
      );
    });

    it('locks the second step after five wrong codes, then lets it try again', async () => {
      const { secret } = await enable();
      const { body } = await login().expect(200);
      for (let i = 0; i < 4; i++) await verify(body.challengeToken, '000000').expect(403);
      // The fifth wrong code closes the challenge and locks the account's second step.
      await verify(body.challengeToken, '000000').expect(403);
      expect((await verify(body.challengeToken, code(secret)).expect(401)).body.code).toBe(
        'TWO_FACTOR_CHALLENGE_EXPIRED'
      );
      const fresh = await login().expect(200);
      const locked = await verify(fresh.body.challengeToken, code(secret)).expect(429);
      expect(locked.body).toMatchObject({
        code: 'TWO_FACTOR_LOCKED',
        details: { retryAfterSeconds: LOCK_MS / 1000 },
      });
      // The settings are locked as well.
      await request(ctx.app)
        .post('/api/auth/2fa/disable')
        .set(user.auth)
        .send({ code: code(secret) })
        .expect(429);

      ctx.clock.set(new Date(ctx.clock.now().getTime() + LOCK_MS).toISOString());
      const later = await login().expect(200);
      await verify(later.body.challengeToken, code(secret)).expect(200);
    });

    it('closes a challenge after five attempts although the account is not locked', async () => {
      const { secret } = await enable();
      const a = await login().expect(200);
      const b = await login().expect(200);
      await verify(a.body.challengeToken, '000000').expect(403);
      await verify(a.body.challengeToken, '000000').expect(403);
      await verify(b.body.challengeToken, '000000').expect(403);
      // A good code resets the count of wrong codes in a row.
      await verify(b.body.challengeToken, code(secret)).expect(200);
      nextStep();
      await verify(a.body.challengeToken, '000000').expect(403);
      await verify(a.body.challengeToken, '000000').expect(403);
      await verify(a.body.challengeToken, '000000').expect(403);
      // Five attempts on `a`: it is closed although the account is not locked.
      expect((await verify(a.body.challengeToken, code(secret)).expect(401)).body.code).toBe(
        'TWO_FACTOR_CHALLENGE_EXPIRED'
      );
    });

    it('accepts each recovery code once, in any case and without dashes', async () => {
      const { recoveryCodes } = await enable();
      const first = await login().expect(200);
      const typed = recoveryCodes[0].toUpperCase().replace(/-/g, ' ');
      await verify(first.body.challengeToken, typed).expect(200);
      const second = await login().expect(200);
      expect(
        (await verify(second.body.challengeToken, recoveryCodes[0]).expect(403)).body.code
      ).toBe('INVALID_TWO_FACTOR_CODE');
      await verify(second.body.challengeToken, recoveryCodes[1]).expect(200);
      const status = await request(ctx.app).get('/api/auth/2fa').set(user.auth).expect(200);
      expect(status.body.recoveryCodesRemaining).toBe(8);
      await flush();
      expect(notices().filter(([, n]) => n === 'recovery_code_used')).toHaveLength(2);
    });

    it('still accepts recovery codes when the secret cannot be decrypted', async () => {
      const { secret, recoveryCodes } = await enable();
      ctx.container.db
        .prepare("UPDATE user_two_factor SET secret_enc = 'v1.broken' WHERE user_id = ?")
        .run(user.id);
      const { body } = await login().expect(200);
      await verify(body.challengeToken, code(secret)).expect(403);
      await verify(body.challengeToken, recoveryCodes[0]).expect(200);
    });

    it('asks Google sign-ins for the code too', async () => {
      await enable();
      ctx.google.identities.set('g-token', {
        googleId: 'g-ana',
        email: 'ana@example.com',
        emailVerified: true,
        name: 'Ana',
      });
      const res = await request(ctx.app)
        .post('/api/auth/google')
        .send({ token: 'g-token' })
        .expect(200);
      expect(res.body.twoFactorRequired).toBe(true);
      expect(res.body.accessToken).toBeUndefined();
    });

    it('keeps 2FA after a password reset', async () => {
      await enable();
      await request(ctx.app).post('/api/auth/forgot-password').send({ email: user.email });
      const token = [...ctx.email.sent].reverse().find((s) => s.kind === 'reset')!.token;
      await request(ctx.app)
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'N3w-password!' })
        .expect(200);
      const res = await request(ctx.app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'N3w-password!' })
        .expect(200);
      expect(res.body.twoFactorRequired).toBe(true);
    });
  });

  describe('settings', () => {
    it('renews the recovery codes with the password or a code', async () => {
      const { secret, recoveryCodes } = await enable();
      const missing = await request(ctx.app)
        .post('/api/auth/2fa/recovery-codes')
        .set(user.auth)
        .send({})
        .expect(400);
      expect(missing.body).toMatchObject({
        code: 'TWO_FACTOR_PROOF_REQUIRED',
        error: 'Introduce tu contraseña o un código de verificación',
      });
      await request(ctx.app)
        .post('/api/auth/2fa/recovery-codes')
        .set(user.auth)
        .send({ password: 'wrong' })
        .expect(403);
      const byPassword = await request(ctx.app)
        .post('/api/auth/2fa/recovery-codes')
        .set(user.auth)
        .send({ password: STRONG_PASSWORD })
        .expect(200);
      expect(byPassword.body.recoveryCodes).toHaveLength(10);
      const byCode = await request(ctx.app)
        .post('/api/auth/2fa/recovery-codes')
        .set(user.auth)
        .send({ code: code(secret) })
        .expect(200);
      expect(byCode.body.recoveryCodes).not.toEqual(byPassword.body.recoveryCodes);
      // Neither the first nor the second set works any more.
      const { body } = await login().expect(200);
      await verify(body.challengeToken, recoveryCodes[0]).expect(403);
      await verify(body.challengeToken, byPassword.body.recoveryCodes[0]).expect(403);
      await verify(body.challengeToken, byCode.body.recoveryCodes[0]).expect(200);
      await flush();
      expect(notices().filter(([, n]) => n === 'recovery_codes_regenerated')).toHaveLength(2);
    });

    it('turns off with a code and signs in with the password alone again', async () => {
      const { secret } = await enable();
      await request(ctx.app)
        .post('/api/auth/2fa/disable')
        .set(user.auth)
        .send({ code: '000000' })
        .expect(403);
      await request(ctx.app)
        .post('/api/auth/2fa/disable')
        .set(user.auth)
        .send({ code: code(secret) })
        .expect(204);
      expect((await login().expect(200)).body.accessToken).toEqual(expect.any(String));
      const status = await request(ctx.app).get('/api/auth/2fa').set(user.auth).expect(200);
      expect(status.body.enabled).toBe(false);
      for (const table of ['user_two_factor', 'two_factor_recovery_codes']) {
        const n = ctx.container.db
          .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`)
          .get(user.id) as { n: number };
        expect(n.n).toBe(0);
      }
      await flush();
      expect(notices()).toContainEqual(['ana@example.com', 'two_factor_disabled']);
      // Nothing to turn off now.
      const again = await request(ctx.app)
        .post('/api/auth/2fa/disable')
        .set(user.auth)
        .send({ password: STRONG_PASSWORD })
        .expect(409);
      expect(again.body.code).toBe('TWO_FACTOR_NOT_ENABLED');
    });

    it('turns off with the password', async () => {
      await enable();
      await request(ctx.app)
        .post('/api/auth/2fa/disable')
        .set(user.auth)
        .send({ password: STRONG_PASSWORD })
        .expect(204);
    });

    it('asks Google-only accounts for a recent sign-in to start and a code to turn off', async () => {
      ctx.google.identities.set('g-new', {
        googleId: 'g-bea',
        email: 'bea@example.com',
        emailVerified: true,
        name: 'Bea',
      });
      const signIn = await request(ctx.app)
        .post('/api/auth/google')
        .send({ token: 'g-new' })
        .expect(200);
      const auth = { Authorization: `Bearer ${signIn.body.accessToken}` };
      const { body } = await setup(auth, {}).expect(200);
      await request(ctx.app)
        .post('/api/auth/2fa/enable')
        .set(auth)
        .send({ code: code(body.secret) })
        .expect(200);
      nextStep();
      const noProof = await request(ctx.app)
        .post('/api/auth/2fa/disable')
        .set(auth)
        .send({ password: 'anything' })
        .expect(400);
      expect(noProof.body).toMatchObject({
        code: 'TWO_FACTOR_PROOF_REQUIRED',
        error: 'Introduce un código de verificación',
      });
      await request(ctx.app)
        .post('/api/auth/2fa/disable')
        .set(auth)
        .send({ code: code(body.secret) })
        .expect(204);

      // Long after the sign-in, starting again needs a fresh Google sign-in.
      ctx.clock.set('2026-03-15T13:00:00Z');
      const stale = await setup(auth, {}).expect(403);
      expect(stale.body.code).toBe('REAUTH_REQUIRED');
      await setup(auth, { googleToken: 'g-new' }).expect(200);
    });
  });

  describe('personal data', () => {
    it('says whether 2FA is on in the export, never the secret', async () => {
      const off = await request(ctx.app).get('/api/export').set(user.auth).expect(200);
      expect(off.body.security).toEqual({
        twoFactorEnabled: false,
        twoFactorEnabledAt: null,
        recoveryCodesRemaining: 0,
      });
      const { secret, recoveryCodes } = await enable();
      const on = await request(ctx.app).get('/api/export').set(user.auth).expect(200);
      expect(on.body.security).toEqual({
        twoFactorEnabled: true,
        twoFactorEnabledAt: '2026-03-15T12:00:00.000Z',
        recoveryCodesRemaining: 10,
      });
      const text = JSON.stringify(on.body);
      expect(text).not.toContain(secret);
      expect(text).not.toContain(recoveryCodes[0]);
    });

    it('removes the secret, the codes and the challenges with the account', async () => {
      await enable();
      await login().expect(200);
      await request(ctx.app)
        .delete('/api/profile/account')
        .set(user.auth)
        .send({ password: STRONG_PASSWORD })
        .expect(204);
      for (const table of [
        'user_two_factor',
        'two_factor_recovery_codes',
        'two_factor_challenges',
      ]) {
        const n = ctx.container.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
          n: number;
        };
        expect(n.n).toBe(0);
      }
    });
  });

  describe('edge cases', () => {
    it('closes a challenge whose 2FA was turned off meanwhile', async () => {
      const challenge = ctx.container.twoFactor.createChallenge(user.id);
      expect(() =>
        ctx.container.auth.completeTwoFactorLogin(challenge.challengeToken, '123456')
      ).toThrow(expect.objectContaining({ code: 'TWO_FACTOR_CHALLENGE_EXPIRED' }));
      const left = ctx.container.db
        .prepare('SELECT COUNT(*) AS n FROM two_factor_challenges')
        .get() as { n: number };
      expect(left.n).toBe(0);
    });

    it('does not open a session for a user that no longer exists', async () => {
      const { recoveryCodes } = await enable();
      const { body } = await login().expect(200);
      ctx.container.db.pragma('foreign_keys = OFF');
      ctx.container.db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
      ctx.container.db.pragma('foreign_keys = ON');
      expect(() =>
        ctx.container.auth.completeTwoFactorLogin(body.challengeToken, recoveryCodes[0])
      ).toThrow(expect.objectContaining({ code: 'INVALID_TOKEN' }));
      expect(() => ctx.container.twoFactor.startEnrollment(user.id)).toThrow(
        expect.objectContaining({ code: 'USER_NOT_FOUND' })
      );
    });

    it('logs a security e-mail that could not be sent', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      jest.spyOn(ctx.email, 'sendSecurityNotice').mockRejectedValue(new Error('down'));
      await enable();
      await flush();
      expect(error).toHaveBeenCalledWith('[email] send failed', expect.any(Error));
      error.mockRestore();
    });
  });

  it('limits second-step attempts per network', async () => {
    const live = createTestApp({ env: { NODE_ENV: 'development' } });
    for (let i = 0; i < 20; i++) {
      await request(live.app)
        .post('/api/auth/2fa/verify')
        .send({ challengeToken: 'x', code: '123456' })
        .expect(401);
    }
    const res = await request(live.app)
      .post('/api/auth/2fa/verify')
      .send({ challengeToken: 'x', code: '123456' })
      .expect(429);
    expect(res.body.code).toBe('RATE_LIMITED');
  });
});
