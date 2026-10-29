import request from 'supertest';
import { DRAWINGS_MAX, DRAWING_TEXT_MAX } from '@domain/services/crypto-drawings';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

// Every price and note here is made up.
const T = Date.parse('2026-03-14T10:00:00Z');
const trend = (id = 'd1', extra: Record<string, unknown> = {}) => ({
  id,
  kind: 'trend',
  color: 'yellow',
  points: [
    { time: T, price: 48_000 },
    { time: T + 3_600_000, price: 50_500.25 },
  ],
  ...extra,
});
const note = {
  id: 'n1',
  kind: 'text',
  color: 'white',
  points: [{ time: T, price: 49_000 }],
  text: '  Soporte de la semana  ',
};

describe('Crypto console chart drawings', () => {
  let ctx: TestContext;
  let user: TestUser;
  const get = (u: TestUser, symbol: string) =>
    request(ctx.app).get(`/api/crypto/drawings/${symbol}`).set(u.auth);
  const put = (u: TestUser, symbol: string, body: unknown) =>
    request(ctx.app)
      .put(`/api/crypto/drawings/${symbol}`)
      .set(u.auth)
      .send(body as object);

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-03-15T12:00:00Z' });
    user = await createUser(ctx);
  });

  it('starts empty, keeps the list of each coin apart and empties it', async () => {
    expect((await get(user, 'BTC').expect(200)).body).toEqual({
      symbol: 'BTC',
      drawings: [],
      max: DRAWINGS_MAX,
      updatedAt: null,
    });
    const saved = await put(user, 'BTC', { drawings: [trend(), note] }).expect(200);
    expect(saved.body.updatedAt).toBe('2026-03-15T12:00:00.000Z');
    // The note is kept without the spaces around it.
    expect(saved.body.drawings).toEqual([trend(), { ...note, text: 'Soporte de la semana' }]);
    expect((await get(user, 'BTC').expect(200)).body.drawings).toHaveLength(2);
    expect((await get(user, 'ETH').expect(200)).body.drawings).toEqual([]);

    await put(user, 'ETH', { drawings: [trend('e1', { kind: 'rect', color: 'cyan' })] }).expect(
      200
    );
    ctx.clock.set('2026-03-15T13:00:00Z');
    await put(user, 'BTC', { drawings: [note] }).expect(200);
    expect((await get(user, 'BTC').expect(200)).body).toMatchObject({
      drawings: [{ id: 'n1' }],
      updatedAt: '2026-03-15T13:00:00.000Z',
    });
    expect((await get(user, 'ETH').expect(200)).body.drawings).toEqual([
      expect.objectContaining({ id: 'e1', kind: 'rect' }),
    ]);

    // An empty list removes the row.
    expect((await put(user, 'BTC', { drawings: [] }).expect(200)).body.updatedAt).toBeNull();
    const rows = ctx.container.db
      .prepare('SELECT symbol FROM crypto_drawings WHERE user_id = ?')
      .pluck()
      .all(user.id);
    expect(rows).toEqual(['ETH']);
  });

  it('never shows or changes the drawings of somebody else', async () => {
    const other = await createUser(ctx);
    await put(user, 'BTC', { drawings: [trend()] }).expect(200);
    expect((await get(other, 'BTC').expect(200)).body.drawings).toEqual([]);
    await put(other, 'BTC', { drawings: [] }).expect(200);
    expect((await get(user, 'BTC').expect(200)).body.drawings).toHaveLength(1);
  });

  it('asks for a session', async () => {
    await request(ctx.app).get('/api/crypto/drawings/BTC').expect(401);
    await request(ctx.app).put('/api/crypto/drawings/BTC').send({ drawings: [] }).expect(401);
  });

  it.each([
    ['an unknown coin', 'FAKE', { drawings: [] }],
    ['a list that is not one', 'BTC', { drawings: {} }],
    ['other fields', 'BTC', { drawings: [], owner: 'x' }],
    [
      'too many drawings',
      'BTC',
      { drawings: Array.from({ length: 51 }, (_, i) => trend(`d${i}`)) },
    ],
    ['repeated ids', 'BTC', { drawings: [trend(), trend()] }],
    ['an id with odd characters', 'BTC', { drawings: [trend('<b>')] }],
    ['a long id', 'BTC', { drawings: [trend('x'.repeat(41))] }],
    ['an unknown kind', 'BTC', { drawings: [trend('d1', { kind: 'circle' })] }],
    ['a free colour', 'BTC', { drawings: [trend('d1', { color: '#ff0000' })] }],
    [
      'a trend line with one point',
      'BTC',
      { drawings: [trend('d1', { points: [{ time: T, price: 1 }] })] },
    ],
    [
      'a horizontal line with two points',
      'BTC',
      { drawings: [trend('d1', { kind: 'horizontal' })] },
    ],
    [
      'a negative price',
      'BTC',
      {
        drawings: [
          trend('d1', {
            points: [
              { time: T, price: -1 },
              { time: T, price: 1 },
            ],
          }),
        ],
      },
    ],
    ['a time before Bitcoin', 'BTC', { drawings: [{ ...note, points: [{ time: 0, price: 1 }] }] }],
    [
      'a time with decimals',
      'BTC',
      { drawings: [{ ...note, points: [{ time: T + 0.5, price: 1 }] }] },
    ],
    [
      'extra fields in a point',
      'BTC',
      { drawings: [{ ...note, points: [{ time: T, price: 1, x: 3 }] }] },
    ],
    ['a note without text', 'BTC', { drawings: [{ ...note, text: undefined }] }],
    ['a note of spaces', 'BTC', { drawings: [{ ...note, text: '   ' }] }],
    ['a long note', 'BTC', { drawings: [{ ...note, text: 'a'.repeat(DRAWING_TEXT_MAX + 1) }] }],
    ['a note with a line break', 'BTC', { drawings: [{ ...note, text: 'a\nb' }] }],
    ['text on a line', 'BTC', { drawings: [trend('d1', { text: 'hola' })] }],
  ])('refuses %s', async (_what, symbol, body) => {
    const res = await put(user, symbol, body).expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect((await get(user, 'BTC').expect(200)).body.drawings).toEqual([]);
  });

  it('accepts the most drawings and the longest note', async () => {
    const many = Array.from({ length: DRAWINGS_MAX - 1 }, (_, i) => trend(`d${i}`));
    const long = { ...note, text: 'ñ'.repeat(DRAWING_TEXT_MAX) };
    await put(user, 'BTC', { drawings: [...many, long] }).expect(200);
    expect((await get(user, 'BTC').expect(200)).body.drawings).toHaveLength(DRAWINGS_MAX);
  });

  it('reads a damaged row as no drawings', async () => {
    await put(user, 'BTC', { drawings: [trend()] }).expect(200);
    const damage = (value: string) =>
      ctx.container.db
        .prepare('UPDATE crypto_drawings SET drawings = ? WHERE user_id = ?')
        .run(value, user.id);
    damage('{not json');
    expect((await get(user, 'BTC').expect(200)).body.drawings).toEqual([]);
    damage('{"a":1}');
    expect((await get(user, 'BTC').expect(200)).body.drawings).toEqual([]);
  });

  it('exports the drawings and deletes them with the account', async () => {
    await put(user, 'BTC', { drawings: [note] }).expect(200);
    const exported = (await request(ctx.app).get('/api/export').set(user.auth).expect(200)).body;
    expect(exported.cryptoDrawings).toEqual([
      {
        symbol: 'BTC',
        updatedAt: '2026-03-15T12:00:00.000Z',
        drawings: [{ ...note, text: 'Soporte de la semana' }],
      },
    ]);
    ctx.container.db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    const left = ctx.container.db.prepare('SELECT COUNT(*) AS n FROM crypto_drawings').get() as {
      n: number;
    };
    expect(left.n).toBe(0);
  });

  it('limits saves per user outside tests, apart from reads', async () => {
    const live = createTestApp({ env: { NODE_ENV: 'development' } });
    const person = await createUser(live);
    const save = () =>
      request(live.app)
        .put('/api/crypto/drawings/BTC')
        .set(person.auth)
        .send({ drawings: [trend()] });
    for (let i = 0; i < 60; i++) await save().expect(200);
    expect((await save().expect(429)).body.code).toBe('RATE_LIMITED');
    await request(live.app).get('/api/crypto/drawings/BTC').set(person.auth).expect(200);
  });
});
