import { readFileSync } from 'fs';
import { join } from 'path';
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
      'letras-del-tesoro',
      'bonos-obligaciones-estado',
      'comprar-deuda-publica',
      'deuda-publica-renta',
      'letras-depositos-monetarios',
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
    const calcs = ['compound', 'crypto', 'bond', 'tax', 'stock', 'letra'];
    const blocks = PREMIUM_CHAPTERS.flatMap((c) => c.blocks);
    const used = (k: 'chart' | 'calc') => new Set(blocks.flatMap((b) => (b.k === k ? [b.id] : [])));
    for (const id of used('chart')) expect(charts).toContain(id);
    for (const id of used('calc')) expect(calcs).toContain(id);
    for (const id of ['bondCurve', 'leverage']) expect(used('chart').has(id)).toBe(true);
    for (const id of ['compound', 'crypto', 'bond', 'tax', 'letra']) {
      expect(used('calc').has(id)).toBe(true);
    }
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

describe('Government debt chapters', () => {
  const chapter = (id: string) => PREMIUM_CHAPTERS.find((c) => c.id === id)!;
  const text = (id: string) => JSON.stringify(chapter(id));

  it('serves a Premium user each one, and refuses the rest', async () => {
    const ctx = createTestApp();
    const user = await createUser(ctx);
    for (const id of ['letras-del-tesoro', 'comprar-deuda-publica', 'deuda-publica-renta']) {
      const res = await request(ctx.app)
        .get(`/api/learn/chapters/${id}`)
        .set(user.auth)
        .expect(200);
      expect(res.body.blocks).toEqual(chapter(id).blocks);
    }
    expect(text('letras-del-tesoro')).toContain('"k":"calc","id":"letra"');
    expireTrial(ctx, user);
    await request(ctx.app).get('/api/learn/chapters/letras-del-tesoro').set(user.auth).expect(402);
  });

  it('follows the bonds chapter, all under the bonds topic', () => {
    const ids = PREMIUM_CHAPTERS.map((c) => c.id);
    const start = ids.indexOf('renta-fija-bonos');
    expect(ids.slice(start + 1, start + 6)).toEqual([
      'letras-del-tesoro',
      'bonos-obligaciones-estado',
      'comprar-deuda-publica',
      'deuda-publica-renta',
      'letras-depositos-monetarios',
    ]);
    for (const id of ids.slice(start, start + 6)) expect(chapter(id).topic).toBe('bonds');
  });

  it('states the current official facts', () => {
    expect(text('letras-del-tesoro')).toMatch(/3, 6, 9 y 12 meses/);
    expect(text('letras-del-tesoro')).toMatch(/ACTUAL\/360/);
    expect(text('letras-del-tesoro')).toMatch(/múltiplos de 1\.000/);
    expect(text('bonos-obligaciones-estado')).toMatch(/10, 15, 30 y 50 años/);
    expect(text('bonos-obligaciones-estado')).toMatch(/indexados/);
    expect(text('comprar-deuda-publica')).toMatch(/no competitiva/);
    expect(text('comprar-deuda-publica')).toMatch(/1,5 por mil/);
    expect(text('comprar-deuda-publica')).toMatch(/secundario/);
    const renta = text('deuda-publica-renta');
    for (const box of ['0027', '0030', '0031']) expect(renta).toContain(box);
    expect(renta).toMatch(/19 %/);
    expect(renta).toMatch(/art\. 75\.3 b/);
    expect(renta).toMatch(/25 %/);
    expect(renta).toMatch(/dos meses/);
    expect(text('letras-depositos-monetarios')).toMatch(/100\.000 €/);
  });

  it('never promises returns and says it is not advice', () => {
    for (const id of [
      'letras-del-tesoro',
      'bonos-obligaciones-estado',
      'letras-depositos-monetarios',
    ]) {
      expect(text(id)).toMatch(/no asesoramiento/);
    }
    const all = PREMIUM_CHAPTERS.map((c) => JSON.stringify(c)).join(' ');
    expect(all).not.toMatch(/NO CONFIRMAD/);
    for (const id of ['letras-del-tesoro', 'letras-depositos-monetarios']) {
      expect(text(id)).not.toMatch(/te recomendamos (comprar|invertir)/i);
    }
  });
});

describe('The catalogue of the app', () => {
  // The app lists the Premium chapters (frontend/src/modules/invest/domain/premiumChapters.ts)
  // and asks the API for their text: every one must be here, in the same order.
  const catalogue = readFileSync(
    join(__dirname, '../../../../frontend/src/modules/invest/domain/premiumChapters.ts'),
    'utf8'
  );

  it('lists exactly the chapters the API serves, with the same titles', () => {
    const ids = [...catalogue.matchAll(/\bid: '([^']+)'/g)].map((m) => m[1]);
    expect(ids).toEqual(PREMIUM_CHAPTERS.map((c) => c.id));
    for (const c of PREMIUM_CHAPTERS)
      expect(catalogue).toContain(`'${c.title.replace(/'/g, "\\'")}'`);
  });
});
