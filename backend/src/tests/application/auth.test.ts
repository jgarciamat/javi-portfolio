import { createHash } from 'crypto';
import { AuthResult } from '@application/auth/AuthService';
import { TestContext, createTestApp, createUser, STRONG_PASSWORD } from '../helpers/testApp';

const hashOf = (token: string) => createHash('sha256').update(token).digest('hex');

/** AuthService edge cases, called directly (the HTTP layer always passes every argument). */
describe('AuthService', () => {
  let ctx: TestContext;
  beforeEach(() => {
    ctx = createTestApp();
  });
  const auth = () => ctx.container.auth;
  const verifyMails = (to: string) =>
    ctx.email.sent.filter((s) => s.kind === 'verify' && s.to === to);

  it('registers in Spanish when no language is given, and resends only to unverified users', async () => {
    await auth().register({ email: 'Nueva@Test.dev', password: STRONG_PASSWORD, name: 'Nueva' });
    const user = ctx.container.repos.users.findByEmail('nueva@test.dev')!;
    expect(ctx.container.repos.settings.get(user.id).locale).toBe('es');
    expect(verifyMails('nueva@test.dev')).toHaveLength(1);

    auth().resendVerification('NUEVA@test.dev');
    await new Promise((r) => setImmediate(r));
    expect(verifyMails('nueva@test.dev')).toHaveLength(2);

    auth().resendVerification('nobody@test.dev');
    const verified = await createUser(ctx);
    auth().resendVerification(verified.email);
    await new Promise((r) => setImmediate(r));
    expect(verifyMails(verified.email)).toHaveLength(1);
  });

  it('refuses a login without password with the same message as a wrong one', async () => {
    const user = await createUser(ctx);
    await expect(
      auth().login({ email: user.email, password: undefined as unknown as string })
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('ends the session when the refresh token is expired or its user is gone', async () => {
    const user = await createUser(ctx);
    expect(auth().refresh(user.refreshToken).accessToken).toEqual(expect.any(String));
    expect(() => auth().refresh('unknown')).toThrow(
      expect.objectContaining({ code: 'SESSION_EXPIRED' })
    );

    // A token whose user no longer exists (defensive: the database cascades deletions).
    const other = await createUser(ctx);
    ctx.container.db.pragma('foreign_keys = OFF');
    ctx.container.db.prepare('DELETE FROM users WHERE id = ?').run(other.id);
    ctx.container.db.pragma('foreign_keys = ON');
    expect(() => auth().refresh(other.refreshToken)).toThrow(
      expect.objectContaining({ code: 'SESSION_EXPIRED' })
    );
    // ...and it was removed: the second attempt finds nothing.
    expect(ctx.container.repos.refreshTokens.findByHash(hashOf(other.refreshToken))).toBeNull();

    // Past its expiry: refused and removed.
    ctx.clock.set('2027-06-01T00:00:00Z');
    expect(() => auth().refresh(user.refreshToken)).toThrow(
      expect.objectContaining({ code: 'SESSION_EXPIRED' })
    );
    expect(ctx.container.repos.refreshTokens.findByHash(hashOf(user.refreshToken))).toBeNull();
  });

  it('closing every session invalidates the access tokens already issued', async () => {
    const user = await createUser(ctx);
    expect(auth().authenticate(user.token)).toEqual({
      userId: user.id,
      authTime: Date.parse('2026-03-15T12:00:00Z'),
    });
    auth().logoutEverywhere('unknown-user');
    auth().logoutEverywhere(user.id);
    expect(() => auth().authenticate(user.token)).toThrow(
      expect.objectContaining({ code: 'INVALID_TOKEN' })
    );
    auth().logout(undefined);
  });

  it('creates Google users in Spanish, named after the e-mail when Google has no name', async () => {
    ctx.google.identities.set('t', {
      googleId: 'g-9',
      email: 'sin.nombre@gmail.com',
      emailVerified: true,
      name: null,
    });
    const result = (await auth().loginWithGoogle('t')) as AuthResult;
    expect(result.user.name).toBe('sin.nombre');
    expect(ctx.container.repos.settings.get(result.user.id).locale).toBe('es');
  });
});
