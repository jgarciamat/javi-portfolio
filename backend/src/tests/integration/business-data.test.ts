import request from 'supertest';
import {
  STRONG_PASSWORD,
  TestContext,
  TestUser,
  createTestApp,
  createUser,
} from '../helpers/testApp';

const quarter = () => ({
  income: { r21: '', r10: '', r4: '', r0: '' },
  withheld: '',
  expenses: [] as unknown[],
});

/** The form as the app sends it, with one imported invoice and one typed expense. */
const form = (concept = 'Cliente Secreto SL') => ({
  manual: {
    profile: {
      workArea: '12',
      homeArea: '90',
      vehicleExclusive: false,
      healthPeople: '2',
      healthDisability: false,
    },
    prior: { on: false, income: '', expenses: '', payments: '', withheld: '' },
    quarters: [
      {
        income: { r21: '4321.5', r10: '', r4: '', r0: '' },
        withheld: '648.23',
        expenses: [{ kind: 'software', amount: '121', vatRate: 21, days: '' }],
      },
      quarter(),
      quarter(),
      quarter(),
    ],
    invoices: [
      {
        id: 'abc123',
        book: 'issued',
        kind: 'other',
        excluded: false,
        date: '2026-02-10',
        quarter: 1,
        base: 4321.5,
        vatRate: 21,
        vat: 907.52,
        total: 5229.02,
        withheld: 648.23,
        concept,
        period: null,
      },
    ],
    model130: { year: 2026, quarter: 1, income: 4321.5, expenses: 100 },
  },
  extras: { hardToJustify: true, exempt: false, priorNet: '', toOffset: '' },
  kinds: { 'proveedor x': 'software' },
});

describe('The self-employed form saved in the account', () => {
  let ctx: TestContext;
  let ana: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    ana = await createUser(ctx, 'ana@example.com');
  });

  const get = (user: TestUser) => request(ctx.app).get('/api/business/data').set(user.auth);
  const put = (user: TestUser, body: object) =>
    request(ctx.app).put('/api/business/data').set(user.auth).send(body);
  const remove = (user: TestUser) => request(ctx.app).delete('/api/business/data').set(user.auth);
  const stored = () =>
    ctx.container.db.prepare('SELECT * FROM autonomo_data').all() as {
      user_id: string;
      payload_enc: string;
      version: number;
      updated_at: string;
    }[];

  it('needs a signed-in user', async () => {
    await request(ctx.app).get('/api/business/data').expect(401);
    await request(ctx.app).put('/api/business/data').send({ data: form() }).expect(401);
    await request(ctx.app).delete('/api/business/data').expect(401);
    await request(ctx.app)
      .get('/api/business/data')
      .set({ Authorization: 'Bearer forged' })
      .expect(401);
  });

  it('keeps nothing until the user saves, then gives back exactly what was saved', async () => {
    expect((await get(ana).expect(200)).body).toBeNull();
    const saved = await put(ana, { data: form(), baseVersion: null }).expect(200);
    expect(saved.body).toEqual({ version: 1, updatedAt: '2026-03-15T12:00:00.000Z' });
    expect((await get(ana).expect(200)).body).toEqual({
      data: form(),
      unreadable: false,
      version: 1,
      updatedAt: '2026-03-15T12:00:00.000Z',
    });

    ctx.clock.set('2026-03-15T12:05:00Z');
    const next = { ...form(), extras: { ...form().extras, priorNet: '-300' } };
    expect((await put(ana, { data: next, baseVersion: 1 }).expect(200)).body).toEqual({
      version: 2,
      updatedAt: '2026-03-15T12:05:00.000Z',
    });
    expect((await get(ana).expect(200)).body).toMatchObject({ data: next, version: 2 });
  });

  it('encrypts the form at rest: no figure or name is stored in clear', async () => {
    await put(ana, { data: form(), baseVersion: null }).expect(200);
    const [row] = stored();
    expect(row.user_id).toBe(ana.id);
    expect(row.payload_enc.startsWith('v1.')).toBe(true);
    for (const plain of ['Cliente Secreto', '4321.5', 'software', 'invoices', 'proveedor']) {
      expect(row.payload_enc).not.toContain(plain);
    }
  });

  it('refuses a save based on an old copy, saying which version is there', async () => {
    await put(ana, { data: form(), baseVersion: null }).expect(200);
    await put(ana, { data: form('Otro'), baseVersion: 1 }).expect(200);
    const stale = await put(ana, { data: form('Viejo'), baseVersion: 1 }).expect(409);
    expect(stale.body).toMatchObject({
      code: 'AUTONOMO_DATA_CONFLICT',
      details: { version: 2, updatedAt: '2026-03-15T12:00:00.000Z' },
    });
    // A device that never synced cannot overwrite either.
    await put(ana, { data: form('Nuevo'), baseVersion: null }).expect(409);
    // Nor claim a version that never existed.
    await remove(ana).expect(204);
    const none = await put(ana, { data: form(), baseVersion: 3 }).expect(409);
    expect(none.body.details).toEqual({ version: null });
    expect((await get(ana).expect(200)).body).toBeNull();
  });

  it('gives a conflict when another save wins between the check and the write', async () => {
    await put(ana, { data: form(), baseVersion: null }).expect(200);
    jest.spyOn(ctx.container.repos.autonomoData, 'save').mockReturnValueOnce(false);
    const lost = await put(ana, { data: form('B'), baseVersion: 1 }).expect(409);
    expect(lost.body.code).toBe('AUTONOMO_DATA_CONFLICT');
  });

  it('keeps each user, household members included, to their own copy', async () => {
    const bea = await createUser(ctx, 'bea@example.com');
    await put(ana, { data: form('De Ana'), baseVersion: null }).expect(200);
    expect((await get(bea).expect(200)).body).toBeNull();
    await put(bea, { data: form('De Bea'), baseVersion: null }).expect(200);
    await remove(bea).expect(204);
    expect((await get(ana).expect(200)).body.data.manual.invoices[0].concept).toBe('De Ana');

    // Bea joins Ana's household: they share the finances, not each other's tax data.
    const { code } = (await request(ctx.app).post('/api/household/invite').set(ana.auth)).body;
    await request(ctx.app).post('/api/household/join').set(bea.auth).send({ code }).expect(204);
    expect((await get(bea).expect(200)).body).toBeNull();
    await put(bea, { data: form('De Bea'), baseVersion: null }).expect(200);
    expect((await get(ana).expect(200)).body.data.manual.invoices[0].concept).toBe('De Ana');
    expect(
      stored()
        .map((r) => r.user_id)
        .sort()
    ).toEqual([ana.id, bea.id].sort());
  });

  it('only takes the form, field by field', async () => {
    const base = form();
    const bad = [
      { data: base },
      { data: base, baseVersion: 0 },
      { data: base, baseVersion: null, extra: true },
      { data: { ...base, notes: 'x' }, baseVersion: null },
      { data: { ...base, manual: { ...base.manual, html: '<b>' } }, baseVersion: null },
      {
        data: { ...base, kinds: { x: 'jewels' } },
        baseVersion: null,
      },
      {
        data: {
          ...base,
          manual: {
            ...base.manual,
            invoices: [{ ...base.manual.invoices[0], date: '10/02/2026' }],
          },
        },
        baseVersion: null,
      },
      {
        data: {
          ...base,
          manual: { ...base.manual, invoices: [{ ...base.manual.invoices[0], vatRate: 7 }] },
        },
        baseVersion: null,
      },
      {
        data: { ...base, manual: { ...base.manual, quarters: base.manual.quarters.slice(0, 3) } },
        baseVersion: null,
      },
      {
        data: { ...base, extras: { ...base.extras, priorNet: '9'.repeat(25) } },
        baseVersion: null,
      },
      {
        data: {
          ...base,
          kinds: Object.fromEntries(Array.from({ length: 2001 }, (_, i) => [`p${i}`, 'other'])),
        },
        baseVersion: null,
      },
    ];
    for (const body of bad) {
      const res = await put(ana, body).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    }
    expect(stored()).toEqual([]);
  });

  it('refuses a form larger than 1 MB, and any body larger than the API takes', async () => {
    const invoice = form().manual.invoices[0];
    const many = (concept: string, length = 5000) =>
      Array.from({ length }, (_, i) => ({ ...invoice, id: `i${i}`, concept }));
    const big = { ...form(), manual: { ...form().manual, invoices: many('x'.repeat(100)) } };
    const res = await put(ana, { data: big, baseVersion: null }).expect(413);
    expect(res.body).toMatchObject({
      code: 'AUTONOMO_DATA_TOO_LARGE',
      details: { maxBytes: 1_000_000 },
    });
    // A busy year (4,000 invoices) fits.
    const fits = { ...form(), manual: { ...form().manual, invoices: many('Proveedor SL', 4000) } };
    await put(ana, { data: fits, baseVersion: null }).expect(200);
    const huge = JSON.stringify({ data: form('x'.repeat(5_000_000)), baseVersion: 1 });
    const tooBig = await request(ctx.app)
      .put('/api/business/data')
      .set(ana.auth)
      .set('Content-Type', 'application/json')
      .send(huge)
      .expect(413);
    expect(tooBig.body.code).toBe('PAYLOAD_TOO_LARGE');
    expect(stored()[0].version).toBe(1);
  });

  it('deletes the copy (twice is fine)', async () => {
    await put(ana, { data: form(), baseVersion: null }).expect(200);
    await remove(ana).expect(204);
    await remove(ana).expect(204);
    expect((await get(ana).expect(200)).body).toBeNull();
    expect(stored()).toEqual([]);
    // Starting again begins at version 1.
    expect((await put(ana, { data: form(), baseVersion: null }).expect(200)).body.version).toBe(1);
  });

  it('says when the stored copy cannot be read, and lets the user replace it', async () => {
    await put(ana, { data: form(), baseVersion: null }).expect(200);
    ctx.container.db.prepare("UPDATE autonomo_data SET payload_enc = 'v1.broken'").run();
    expect((await get(ana).expect(200)).body).toEqual({
      data: null,
      unreadable: true,
      version: 1,
      updatedAt: '2026-03-15T12:00:00.000Z',
    });
    await put(ana, { data: form(), baseVersion: 1 }).expect(200);
    expect((await get(ana).expect(200)).body.unreadable).toBe(false);
  });

  it('goes in the export, in clear, and goes away with the account', async () => {
    const before = await request(ctx.app).get('/api/export').set(ana.auth).expect(200);
    expect(before.body.autonomoData).toBeNull();
    await put(ana, { data: form(), baseVersion: null }).expect(200);
    const after = await request(ctx.app).get('/api/export').set(ana.auth).expect(200);
    expect(after.body.autonomoData).toEqual({
      data: form(),
      unreadable: false,
      version: 1,
      updatedAt: '2026-03-15T12:00:00.000Z',
    });
    await request(ctx.app)
      .delete('/api/profile/account')
      .set(ana.auth)
      .send({ password: STRONG_PASSWORD })
      .expect(204);
    expect(stored()).toEqual([]);
  });

  it('stays off, storing nothing, when the server has no usable key', async () => {
    const weak = createTestApp({ env: { JWT_SECRET: 'too-short-for-a-key' } });
    const user = await createUser(weak);
    const off = await request(weak.app)
      .put('/api/business/data')
      .set(user.auth)
      .send({ data: form(), baseVersion: null })
      .expect(503);
    expect(off.body.code).toBe('AUTONOMO_SYNC_UNAVAILABLE');
    expect(weak.container.db.prepare('SELECT COUNT(*) AS n FROM autonomo_data').get()).toEqual({
      n: 0,
    });
    // Nothing stored: nothing to read. A row left from before cannot be opened, nor exported.
    await request(weak.app).get('/api/business/data').set(user.auth).expect(200, 'null');
    weak.container.db
      .prepare(
        "INSERT INTO autonomo_data (user_id, payload_enc, updated_at, version) VALUES (?, 'v1.a.b.c', 'x', 1)"
      )
      .run(user.id);
    await request(weak.app).get('/api/business/data').set(user.auth).expect(503);
    const exported = await request(weak.app).get('/api/export').set(user.auth).expect(200);
    expect(exported.body.autonomoData).toMatchObject({ data: null, unreadable: true });
    // Deleting needs no key.
    await request(weak.app).delete('/api/business/data').set(user.auth).expect(204);
  });

  it('limits saves per user outside tests', async () => {
    const live = createTestApp({ env: { NODE_ENV: 'development' } });
    const user = await createUser(live);
    let version: number | null = null;
    for (let i = 0; i < 60; i++) {
      const res: request.Response = await request(live.app)
        .put('/api/business/data')
        .set(user.auth)
        .send({ data: form(), baseVersion: version })
        .expect(200);
      version = res.body.version as number;
    }
    const limited = await request(live.app)
      .put('/api/business/data')
      .set(user.auth)
      .send({ data: form(), baseVersion: version })
      .expect(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
    // Reading is not limited by the saves.
    await request(live.app).get('/api/business/data').set(user.auth).expect(200);
  });
});
