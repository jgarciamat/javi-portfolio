import request from 'supertest';
import { STRONG_PASSWORD, TestContext, createTestApp, createUser } from '../helpers/testApp';

const FAR_FUTURE = '2030-01-01T00:00:00Z';

describe('Auth edge cases', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  const register = (email: string) =>
    request(ctx.app)
      .post('/api/auth/register')
      .send({ email, password: STRONG_PASSWORD, name: 'Eva' })
      .expect(201);
  const sentTo = (email: string, kind: 'verify' | 'reset') =>
    ctx.email.sent.filter((s) => s.to === email && s.kind === kind);

  it('resends the verification e-mail only to unverified accounts', async () => {
    await register('new@example.com');
    const verified = await createUser(ctx, 'done@example.com');
    for (const email of ['new@example.com', verified.email, 'nobody@example.com']) {
      await request(ctx.app)
        .post('/api/auth/resend-verification')
        .send({ email, locale: 'en' })
        .expect(200);
    }
    expect(sentTo('new@example.com', 'verify')).toHaveLength(2);
    expect(sentTo(verified.email, 'verify')).toHaveLength(1);
    expect(sentTo('nobody@example.com', 'verify')).toHaveLength(0);
  });

  it('rejects unknown and expired verification links', async () => {
    await register('late@example.com');
    const bad = await request(ctx.app).get('/api/auth/verify-email').query({ token: 'nope' });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_TOKEN');
    ctx.clock.set(FAR_FUTURE);
    const [sent] = sentTo('late@example.com', 'verify');
    const late = await request(ctx.app).get('/api/auth/verify-email').query({ token: sent.token });
    expect(late.body.code).toBe('TOKEN_EXPIRED');
  });

  it('sends one reset e-mail per cooldown and refuses bad or expired links', async () => {
    const user = await createUser(ctx);
    const forgot = () =>
      request(ctx.app).post('/api/auth/forgot-password').send({ email: user.email }).expect(200);
    await forgot();
    await forgot();
    expect(sentTo(user.email, 'reset')).toHaveLength(1);

    const reset = (token: string) =>
      request(ctx.app)
        .post('/api/auth/reset-password')
        .send({ token, newPassword: `${STRONG_PASSWORD}9` });
    expect((await reset('nope').expect(400)).body.code).toBe('INVALID_TOKEN');
    ctx.clock.set(FAR_FUTURE);
    const [sent] = sentTo(user.email, 'reset');
    expect((await reset(sent.token).expect(400)).body.code).toBe('TOKEN_EXPIRED');
  });

  it('ends sessions whose refresh token expired or whose user is gone', async () => {
    const user = await createUser(ctx);
    const refresh = () =>
      request(ctx.app).post('/api/auth/refresh').send({ refreshToken: user.refreshToken });
    await refresh().expect(200);

    const other = await createUser(ctx);
    await request(ctx.app).delete('/api/profile/account').set(other.auth).expect(204);
    const gone = await request(ctx.app)
      .post('/api/auth/refresh')
      .send({ refreshToken: other.refreshToken })
      .expect(401);
    expect(gone.body.code).toBe('SESSION_EXPIRED');

    ctx.clock.set(FAR_FUTURE);
    expect((await refresh().expect(401)).body.code).toBe('SESSION_EXPIRED');
    // The expired token was removed: it fails the same way again.
    expect((await refresh().expect(401)).body.code).toBe('SESSION_EXPIRED');
  });

  it('signs in again with a linked Google account and names new ones after the e-mail', async () => {
    ctx.google.identities.set('g', {
      googleId: 'g-9',
      email: 'lu@gmail.com',
      emailVerified: true,
      name: null,
    });
    const first = await request(ctx.app)
      .post('/api/auth/google')
      .send({ idToken: 'g' })
      .expect(200);
    expect(first.body.user).toMatchObject({ email: 'lu@gmail.com', name: 'lu' });
    const again = await request(ctx.app).post('/api/auth/google').send({ token: 'g' }).expect(200);
    expect(again.body.user.id).toBe(first.body.user.id);
  });

  it('logs e-mail failures without failing the request', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(ctx.email, 'sendVerification').mockRejectedValue(new Error('SMTP down'));
    await register('fail@example.com');
    await new Promise((resolve) => setImmediate(resolve));
    expect(logged).toHaveBeenCalledWith('[email] send failed', expect.any(Error));
    logged.mockRestore();
  });
});
