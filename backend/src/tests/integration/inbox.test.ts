import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser, expireTrial } from '../helpers/testApp';

const SECRET = 'a-long-shared-secret-value';

describe('Receipts forwarded by e-mail', () => {
  let ctx: TestContext;
  let user: TestUser;

  const inbox = async (who = user) =>
    (await request(ctx.app).get('/api/inbox').set(who.auth).expect(200)).body;
  const mail = (
    to: string | string[],
    body: Record<string, unknown> = {},
    secret: string | null = SECRET
  ) => {
    const req = request(ctx.app).post('/api/inbound/email');
    if (secret) req.set('x-inbound-secret', secret);
    return req.send({
      to,
      from: 'Mercadona <no-reply@mercadona.es>',
      subject: 'Tu recibo de Mercadona',
      text: 'Fecha: 02/03/2026\nTotal: 23,40 €',
      ...body,
    });
  };
  const movements = async () =>
    (await request(ctx.app).get('/api/months/2026/3').set(user.auth).expect(200)).body.transactions;

  beforeEach(async () => {
    ctx = createTestApp({
      now: '2026-03-15T12:00:00Z',
      env: { INBOUND_EMAIL_DOMAIN: 'Facturas.finanverso.app', INBOUND_EMAIL_SECRET: SECRET },
    });
    user = await createUser(ctx);
  });

  it('gives every user a private address that stays the same until it is renewed', async () => {
    const first = await inbox();
    expect(first.address).toMatch(/^mm-[a-f0-9]{20}@facturas\.finanverso\.app$/);
    expect(first.recent).toEqual([]);
    expect((await inbox()).address).toBe(first.address);
    const other = await createUser(ctx, 'otra@example.com');
    expect((await inbox(other)).address).not.toBe(first.address);

    const renewed = (await request(ctx.app).post('/api/inbox/rotate').set(user.auth).expect(200))
      .body;
    expect(renewed.address).not.toBe(first.address);
    expect((await mail(first.address)).body).toEqual({ status: 'ignored' });
  });

  it('turns a forwarded receipt into an expense and remembers what happened', async () => {
    const { address } = await inbox();
    const res = await mail(address).expect(200);
    expect(res.body).toEqual({ status: 'imported' });
    const tx = (await movements()).find(
      (t: { description: string }) => t.description === 'Mercadona'
    );
    expect(tx).toMatchObject({ amount: 23.4, type: 'EXPENSE', date: '2026-03-02' });
    expect(tx.notes).toBe('Recibido por email');

    const recent = (await inbox()).recent;
    expect(recent).toEqual([
      expect.objectContaining({ status: 'imported', description: 'Mercadona', amount: 23.4 }),
    ]);
  });

  it('does not record the same receipt twice', async () => {
    const { address } = await inbox();
    await mail(address).expect(200);
    expect((await mail(address)).body).toEqual({ status: 'duplicate' });
    const count = (await movements()).filter(
      (t: { description: string }) => t.description === 'Mercadona'
    );
    expect(count).toHaveLength(1);
  });

  it('accepts several recipients and html-only messages', async () => {
    const { address } = await inbox();
    const res = await mail(`otro@x.com, ${address}`, {
      subject: 'Factura de Iberdrola',
      text: '',
      html: '<style>p{}</style><p>Total&nbsp;a pagar: 55,10 &euro;</p>',
    }).expect(200);
    expect(res.body).toEqual({ status: 'imported' });
    expect(
      (await movements()).find((t: { description: string }) => t.description === 'Iberdrola')
    ).toMatchObject({ amount: 55.1 });
    expect(
      (await mail([address], { text: 'Total: 9,99 €', date: '2026-03-10T10:00:00Z' })).body
    ).toEqual({
      status: 'imported',
    });
  });

  it('keeps messages it cannot read out of the movements', async () => {
    const { address } = await inbox();
    expect((await mail(address, { text: 'Hola, ¿qué tal?' })).body).toEqual({
      status: 'unreadable',
    });
    expect((await inbox()).recent[0]).toMatchObject({
      status: 'unreadable',
      description: null,
      amount: null,
    });
    expect(await movements()).toEqual([]);
  });

  it('reports a failure when the plan does not allow importing', async () => {
    const { address } = await inbox();
    expireTrial(ctx, user);
    expect((await mail(address)).body).toEqual({ status: 'failed' });
    expect((await inbox()).recent[0]).toMatchObject({ status: 'failed', description: 'Mercadona' });
  });

  it('ignores unknown addresses and refuses the wrong secret', async () => {
    expect((await mail('hola@facturas.finanverso.app')).body).toEqual({ status: 'ignored' });
    expect((await mail('mm-00000000000000000000@facturas.finanverso.app')).body).toEqual({
      status: 'ignored',
    });
    await mail('x@y.z', {}, 'not-the-secret').expect(401);
    await mail('x@y.z', {}, null).expect(401);
    await mail('x@y.z', {}, 'short').expect(401);
    await request(ctx.app)
      .post('/api/inbound/email')
      .set('x-inbound-secret', SECRET)
      .send({})
      .expect(400);
  });

  it('is off without the domain and the secret', async () => {
    ctx = createTestApp({ now: '2026-03-15T12:00:00Z' });
    user = await createUser(ctx);
    expect(await inbox()).toEqual({ address: null, recent: [] });
    const renewed = (await request(ctx.app).post('/api/inbox/rotate').set(user.auth).expect(200))
      .body;
    expect(renewed.address).toBeNull();
    await mail('mm-00000000000000000000@x.com').expect(401);
  });

  it('keeps only the latest messages', async () => {
    const { address } = await inbox();
    for (let i = 0; i < 12; i++) {
      await mail(address, { subject: `Recibo de Tienda${i}`, text: `Total: ${i + 1},00 €` });
    }
    const recent = (await inbox()).recent;
    expect(recent).toHaveLength(10);
    expect(recent[0].description).toBe('Tienda11');
  });

  it('rejects callers without the secret before reading the message, however large it is', async () => {
    const started = Date.now();
    await request(ctx.app)
      .post('/api/inbound/email')
      .send({ to: 'x@y.z', html: '<'.repeat(199_000) })
      .expect(401);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('reads hostile html and long digit runs quickly when the secret is right', async () => {
    const { address } = await inbox();
    const started = Date.now();
    await mail(address, { text: '', html: '<'.repeat(199_000) }).expect(200);
    await mail(address, { text: `${'1'.repeat(49_000)} €` }).expect(200);
    await mail(`${'<'.repeat(900)}${address}`).expect(200);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('refuses oversized recipients', async () => {
    await mail('a'.repeat(1001)).expect(400);
  });
});
