import request from 'supertest';
import {
  STRONG_PASSWORD,
  TestContext,
  TestUser,
  createTestApp,
  createUser,
} from '../helpers/testApp';

describe('HTTP platform', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  it('reports health, and 503 when the database is gone', async () => {
    await request(ctx.app)
      .get('/api/health')
      .expect(200, { status: 'ok', app: 'money-manager-api' });
    ctx.container.db.close();
    await request(ctx.app).get('/api/health').expect(503);
  });

  it('allows CORS only for the configured origins', async () => {
    const allowed = await request(ctx.app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const other = await request(ctx.app)
      .get('/api/health')
      .set('Origin', 'https://evil.example')
      .expect(200);
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers unknown routes, broken JSON and oversized bodies in the API format', async () => {
    const user = await createUser(ctx);
    await request(ctx.app)
      .get('/api/nothing')
      .set(user.auth)
      .expect(404, { error: 'Ruta no encontrada', code: 'ROUTE_NOT_FOUND' });
    const broken = await request(ctx.app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(broken.body.code).toBe('INVALID_JSON');
    const huge = await request(ctx.app)
      .post('/api/client-errors')
      .send({ kind: 'error', message: 'x', stack: 'y'.repeat(5 * 1024 * 1024) })
      .expect(413);
    expect(huge.body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('hides unexpected errors behind a 500', async () => {
    const user = await createUser(ctx);
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(ctx.container.settings, 'get').mockImplementation(() => {
      throw new Error('disk on fire');
    });
    const res = await request(ctx.app).get('/api/settings').set(user.auth).expect(500);
    expect(res.body).toEqual({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    expect(logged).toHaveBeenCalledWith('[http] unexpected error', expect.any(Error));
    logged.mockRestore();
  });

  it('limits sign-in attempts per e-mail and IP outside tests', async () => {
    const live = createTestApp({ env: { NODE_ENV: 'development' } });
    // Google sign-in shares the login limiter and skips bcrypt, so the test stays fast.
    const attempt = (email?: string) =>
      request(live.app).post('/api/auth/google').send({ token: 'forged', email });
    for (let i = 0; i < 10; i++) await attempt('a@example.com').expect(401);
    const limited = await attempt('a@example.com').expect(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
    // Another e-mail from the same network is not locked out; no e-mail is its own key.
    await attempt('b@example.com').expect(401);
    await attempt().expect(401);
  });
});

describe('Profile', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  const avatar = (avatarDataUrl: string | null) =>
    request(ctx.app).patch('/api/profile/avatar').set(user.auth).send({ avatarDataUrl });

  it('returns the profile with its settings and renames it', async () => {
    const profile = await request(ctx.app).get('/api/profile').set(user.auth).expect(200);
    expect(profile.body).toMatchObject({ email: user.email, name: 'Test User' });
    expect(profile.body.settings).toMatchObject({ locale: 'es' });
    await request(ctx.app)
      .patch('/api/profile/name')
      .set(user.auth)
      .send({ name: '  Ana  ' })
      .expect(200, { name: 'Ana' });
  });

  it('accepts small images, rejects other formats and big files, and removes the avatar', async () => {
    const png = `data:image/png;base64,${Buffer.from('png').toString('base64')}`;
    await avatar(png).expect(200, { avatarUrl: png });
    expect((await avatar('data:image/svg+xml;base64,AAAA').expect(400)).body.code).toBe(
      'INVALID_IMAGE'
    );
    expect((await avatar('not a data url').expect(400)).body.code).toBe('INVALID_IMAGE');
    const big = Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64');
    expect((await avatar(`data:image/jpeg;base64,${big}`).expect(400)).body.code).toBe(
      'IMAGE_TOO_LARGE'
    );
    await avatar(null).expect(200, { avatarUrl: null });
  });

  it('rejects the tokens of a deleted account at once', async () => {
    await request(ctx.app).delete('/api/profile/account').set(user.auth).expect(204);
    const res = await request(ctx.app).get('/api/profile').set(user.auth).expect(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('keeps the password when the current one is wrong', async () => {
    const res = await request(ctx.app)
      .patch('/api/profile/password')
      .set(user.auth)
      .send({ currentPassword: 'nope', newPassword: `${STRONG_PASSWORD}2` })
      .expect(401);
    expect(res.body.code).toBe('WRONG_PASSWORD');
  });
});
