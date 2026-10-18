import request from 'supertest';
import { TestContext, TestUser, createTestApp, createUser, expireTrial } from '../helpers/testApp';
import { PREMIUM_CHAPTERS } from '@infrastructure/learn';

describe('Premium chapters of the investing course', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
  });

  const chapter = (id: string, who = user) =>
    request(ctx.app).get(`/api/learn/chapters/${id}`).set(who.auth);

  it('serves the third chapter on to Premium users, never cached', async () => {
    expect(PREMIUM_CHAPTERS.map((c) => c.id)).toEqual([
      'fondos-indexados',
      'etf-vs-fondos',
      'interes-compuesto-fondos',
      'renta-fija-bonos',
      'cuanto-tributa',
      'cripto-y-blockchain',
      'cripto-volatilidad-apalancamiento',
      'cripto-monedas-y-proyectos',
      'cripto-riesgos-estafas-mica',
    ]);
    const res = await chapter('fondos-indexados').expect(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.body.id).toBe('fondos-indexados');
    expect(res.body.blocks.length).toBeGreaterThan(5);
    expect(res.body.glossary.length).toBeGreaterThan(0);
    expect(Object.keys(res.body).sort()).toEqual(['blocks', 'glossary', 'id']);
    await chapter('acciones').expect(404); // free chapters live in the app
  });

  it('serves the glossary of the Premium chapters', async () => {
    const res = await request(ctx.app).get('/api/learn/glossary').set(user.auth).expect(200);
    const total = PREMIUM_CHAPTERS.reduce((n, c) => n + c.glossary.length, 0);
    expect(res.body).toHaveLength(total);
    expect(res.body[0]).toEqual({
      ...PREMIUM_CHAPTERS[0].glossary[0],
      chapterId: 'fondos-indexados',
    });
  });

  it('refuses free users and anonymous callers', async () => {
    expireTrial(ctx, user);
    const refused = await chapter('fondos-indexados').expect(402);
    expect(refused.body).toMatchObject({
      code: 'PREMIUM_REQUIRED',
      details: { feature: 'investCourse' },
    });
    await request(ctx.app).get('/api/learn/glossary').set(user.auth).expect(402);
    await request(ctx.app).get('/api/learn/chapters/fondos-indexados').expect(401);
  });
});

describe('Content of the Premium chapters', () => {
  it('is complete in Spanish and English, with key points and a glossary', () => {
    const topics = ['basics', 'stocks', 'funds', 'bonds', 'crypto', 'tax'];
    for (const c of PREMIUM_CHAPTERS) {
      expect(c.title.length).toBeGreaterThan(10);
      expect(c.titleEn.length).toBeGreaterThan(10);
      expect(c.summaryEn.length).toBeGreaterThan(10);
      expect(topics).toContain(c.topic);
      expect(c.glossary.length).toBeGreaterThanOrEqual(4);
      expect(c.blocks.filter((b) => b.k === 'key').length).toBeGreaterThan(0);
    }
  });

  it('only embeds charts and calculators the app can draw, and uses the advanced ones', () => {
    const charts = ['volatility', 'drawdown', 'horizon', 'bondCurve', 'leverage', 'stockVsIndex'];
    const calcs = ['compound', 'crypto', 'bond', 'tax', 'stock'];
    const blocks = PREMIUM_CHAPTERS.flatMap((c) => c.blocks);
    const used = (k: 'chart' | 'calc') => new Set(blocks.flatMap((b) => (b.k === k ? [b.id] : [])));
    for (const id of used('chart')) expect(charts).toContain(id);
    for (const id of used('calc')) expect(calcs).toContain(id);
    for (const id of ['bondCurve', 'leverage']) expect(used('chart').has(id)).toBe(true);
    for (const id of ['compound', 'crypto', 'bond', 'tax']) expect(used('calc').has(id)).toBe(true);
  });

  it('describes every project asked for, dated', () => {
    const text = JSON.stringify(
      PREMIUM_CHAPTERS.find((c) => c.id === 'cripto-monedas-y-proyectos')
    );
    for (const name of ['Bitcoin', 'Ethereum', 'BNB', 'Solana', 'XRP', 'Cardano', 'USDT', 'USDC']) {
      expect(text).toContain(name);
    }
    expect(text).toContain('a fecha de redacción');
  });
});
