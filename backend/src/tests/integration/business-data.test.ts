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
      {
        id: 'pdf001',
        book: 'received',
        kind: 'rent',
        excluded: false,
        date: '2026-02-11',
        quarter: 1,
        base: 800,
        vatRate: 21,
        vat: 168,
        total: 848,
        withheld: 0,
        concept,
        period: null,
        retention: 152,
        retentionFix: 150,
        nif: 'B00000000',
        withholding: 'rent',
        source: 'pdf',
        review: ['rate', 'issuer'],
        missing: ['date'],
      },
    ],
    withholdings: [withholding(), withholding(), withholding(), withholding()],
    model130: { year: 2026, quarter: 1, income: 4321.5, expenses: 100 },
  },
  extras: { hardToJustify: true, exempt: false, priorNet: '', toOffset: '' },
  kinds: { 'proveedor x': 'software' },
});

const withholding = () => ({
  staff: {
    people: '2',
    paid: '3000',
    withheld: '450',
    kindPeople: '',
    kindPaid: '',
    kindWithheld: '',
  },
  pros: { people: '1', paid: '500', withheld: '75' },
  rent: { people: '', paid: '', withheld: '' },
  filed111: false,
  filed115: true,
  // A complementaria of the 115 of the quarter (invented receipt number).
  complement115: { result: '150', receipt: '1150000000001' },
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
    // «No activity last year» is kept apart from an empty field (box 13 of the 130).
    const next = {
      ...form(),
      extras: { ...form().extras, priorNet: '-300', noPriorActivity: true },
    };
    expect((await put(ana, { data: next, baseVersion: 1 }).expect(200)).body).toEqual({
      version: 2,
      updatedAt: '2026-03-15T12:05:00.000Z',
    });
    expect((await get(ana).expect(200)).body).toMatchObject({ data: next, version: 2 });
  });

  it('keeps the activity of the year: assets, grants and farming modules', async () => {
    const activity = {
      method: 'objective',
      agrarian: true,
      assets: [
        {
          name: 'Tractor',
          group: 'm3',
          cost: '30000',
          land: '',
          start: '2026-03-01',
          use: '100',
          method: 'table',
          rate: '',
          life: '',
          used: false,
          accumulated: '',
          vat: '6300',
          vatPct: '',
        },
      ],
      subsidies: [
        { name: 'Ayuda', kind: 'capital', amount: '6000', year: '2026', quarter: '2', asset: '0' },
      ],
      provisions: '',
      retaFix: '-120',
      selfConsumption: '',
      stockChange: '',
      compensations: ['', '', '', ''],
      paid130: ['', '', '', ''],
      modules: {
        rows: [{ product: 'cereals', income: '40000', transformed: false, reduced: '' }],
        pacAid: '5000',
        staffShare: '',
        rentedShare: '',
        irrigatedShare: '',
        externalMeans: false,
        boughtFeed: false,
        organic: true,
        forestPlan: false,
        youngFarmer: false,
        refunds: '',
        extraordinary: '',
      },
    };
    const base = form();
    const data = { ...base, manual: { ...base.manual, activity } };
    await put(ana, { data, baseVersion: null }).expect(200);
    expect((await get(ana).expect(200)).body.data.manual.activity).toEqual(activity);
    const wrong = { ...data, manual: { ...data.manual, activity: { ...activity, extra: 1 } } };
    await put(ana, { data: wrong, baseVersion: 1 }).expect(400);
    const tooMany = { ...data, manual: { ...data.manual, filed130: ['1', '2', '3', '4', '5'] } };
    await put(ana, { data: tooMany, baseVersion: 1 }).expect(400);

    // A taxi in non-farming modules (frontend activityForm.ts, ObjectiveForm): kept as it is.
    const objective = {
      activityId: 'm59',
      unitsStart: ['0,5', '1', '45'],
      unitsYear: ['', '', '48'],
      staffLastYear: '0,5',
      special: 'upTo100000',
      small: '',
      seasonDays: '',
      seasonLastYear: '',
      seasonQuarters: ['', '', '', ''],
      newYear: '',
      disabled: false,
      startDate: '',
      endDate: '',
      noData: false,
      extraordinary: '',
      otherIncome: '',
      ceutaMelilla: false,
      vatActivity: '',
      vatStart: [],
      vatYear: [],
      vatReduction: '',
      vatSupported: '900',
      vatCompensations: '',
      vatRefundsAbroad: '',
    };
    const taxi = { ...activity, agrarian: false, objective };
    const withTaxi = { ...data, manual: { ...data.manual, activity: taxi } };
    await put(ana, { data: withTaxi, baseVersion: 1 }).expect(200);
    expect((await get(ana).expect(200)).body.data.manual.activity.objective).toEqual(objective);
    const bad = { ...taxi, objective: { ...objective, newYear: '3' } };
    await put(ana, {
      data: { ...data, manual: { ...data.manual, activity: bad } },
      baseVersion: 2,
    }).expect(400);
  });

  it('keeps the VAT of the quarters, of the invoices and of the year (older copies have none)', async () => {
    const vat = {
      sales: {
        intraEU: '3000',
        exports: '',
        notSubject: '',
        oss: '',
        ossSubject: '',
        reverse: '',
        exempt: '',
        exemptOccasional: '',
        nonVat: '',
      },
      re: { r21: '1000', r10: '', r4: '', tobacco: '' },
      salesFix: { base: '-100', vat: '-21', priorYear: '' },
      reFix: { base: '', fee: '' },
      deductionFix: { base: '', vat: '' },
      intraFix: { base: '', vat: '' },
      oneOff: { reagp: '', investmentAdjust: '', art80: '', importDeferred: '' },
      cash: {
        invoiced: { r21: '', r10: '', r4: '' },
        collected: { r21: '', r10: '', r4: '' },
        purchasesInvoiced: { r21: '', r10: '', r4: '' },
        purchasesPaid: { r21: '', r10: '', r4: '' },
      },
      intra: [
        {
          key: 'E',
          vatId: 'FR00000000001',
          name: 'Client Fictif',
          base: '3000',
          rect: false,
          rectYear: '',
          rectQuarter: '',
          previous: '',
        },
      ],
    };
    const base = form();
    const data = {
      ...base,
      manual: {
        ...base.manual,
        quarters: [
          {
            ...base.manual.quarters[0],
            expenses: [
              {
                kind: 'material',
                amount: '1000',
                vatRate: 21,
                days: '',
                op: 'import',
                investment: true,
                use: 'taxed',
              },
            ],
            vat,
          },
          ...base.manual.quarters.slice(1),
        ],
        invoices: [
          {
            ...base.manual.invoices[0],
            op: 'intraEU',
            vatId: 'FR00000000001',
            key349: 'E',
            opFix: true,
          },
          {
            ...base.manual.invoices[1],
            op: 'intraGoods',
            investment: true,
            cash: true,
            rateGuessed: true,
          },
        ],
        filed303: [472, null, null, null],
        filed130: ['', '', '-1000', ''],
      },
      extras: {
        ...base.extras,
        vat: {
          provisional: '80',
          special: false,
          refund: true,
          skip: [3],
          regime: 'general',
          reagpVolume: '',
          cashBasis: false,
          investments: [{ year: '2024', vat: '1000', pct: '50', realEstate: false }],
        },
      },
    };
    await put(ana, { data, baseVersion: null }).expect(200);
    expect((await get(ana).expect(200)).body.data).toEqual(data);
    // Only what the form has: an unknown operation or key is refused.
    const wrong = { ...data, manual: { ...data.manual, filed303: [1, 2] } };
    await put(ana, { data: wrong, baseVersion: 1 }).expect(400);
    const badKey = {
      ...data,
      manual: {
        ...data.manual,
        quarters: [
          { ...data.manual.quarters[0], vat: { ...vat, intra: [{ ...vat.intra[0], key: 'Z' }] } },
          ...data.manual.quarters.slice(1),
        ],
      },
    };
    await put(ana, { data: badKey, baseVersion: 1 }).expect(400);
  });

  it('keeps where the person is in the step-by-step assistant, and only that', async () => {
    const base = form();
    const wizard = {
      at: 3,
      screen: 1,
      done: ['activity', 'import', 'review'],
      answers: { regime: 'general', withholdings: 'unknown' },
      streak: 2,
      lastDay: '2026-10-19',
    };
    const data = { ...base, wizard };
    await put(ana, { data, baseVersion: null }).expect(200);
    expect((await get(ana).expect(200)).body.data.wizard).toEqual(wizard);
    await put(ana, { data: { ...data, wizard: { ...wizard, extra: 1 } }, baseVersion: 1 }).expect(
      400
    );
    await put(ana, {
      data: { ...data, wizard: { ...wizard, lastDay: 'ayer' } },
      baseVersion: 1,
    }).expect(400);
    const many = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`q${i}`, 'yes']));
    await put(ana, {
      data: { ...data, wizard: { ...wizard, answers: many } },
      baseVersion: 1,
    }).expect(400);
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
        data: {
          ...base,
          manual: { ...base.manual, invoices: [{ ...base.manual.invoices[1], review: ['nope'] }] },
        },
        baseVersion: null,
      },
      {
        data: {
          ...base,
          manual: { ...base.manual, withholdings: base.manual.withholdings.slice(0, 3) },
        },
        baseVersion: null,
      },
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
