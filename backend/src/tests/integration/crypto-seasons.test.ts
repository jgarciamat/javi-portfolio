import request from 'supertest';
import { openDatabase } from '@infrastructure/sqlite/database';
import { migrate } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';
import { cryptoSeasonsMigration } from '@infrastructure/sqlite/migrations/039-crypto-seasons';
import {
  STRONG_PASSWORD,
  TestContext,
  TestUser,
  createTestApp,
  createUser,
  expireTrial,
} from '../helpers/testApp';

// Every price, alias and amount here is made up: the fake market answers what each test sets.
const hourly = (iso: string, close: number, low = close, high = close) => ({
  time: Date.parse(iso),
  open: close,
  high,
  low,
  close,
  volume: 1,
});
const PUSH = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/crypto1',
  keys: { p256dh: 'BPublicKey', auth: 'authSecret' },
};
/** 00:30 on 1 April in Madrid (summer time already: UTC+2). */
const APRIL_FIRST = '2026-03-31T22:30:00Z';

describe('Crypto console seasons, practice and ranking', () => {
  let ctx: TestContext;
  let user: TestUser;
  const as = (u: TestUser) => ({
    get: (path: string) => request(ctx.app).get(`/api${path}`).set(u.auth),
    post: (path: string, body: unknown = {}) =>
      request(ctx.app)
        .post(`/api${path}`)
        .set(u.auth)
        .send(body as object),
    put: (path: string, body: unknown) =>
      request(ctx.app)
        .put(`/api${path}`)
        .set(u.auth)
        .send(body as object),
    del: (path: string) => request(ctx.app).delete(`/api${path}`).set(u.auth),
  });
  const me = () => as(user);
  const buy = (u: TestUser, body: Record<string, unknown> = {}) =>
    as(u).post('/crypto/sim/orders', {
      action: 'buy',
      symbol: 'BTC',
      type: 'market',
      amount: 1000,
      ...body,
    });
  const sell = (u: TestUser, positionId: string, body: Record<string, unknown> = {}) =>
    as(u).post('/crypto/sim/orders', { action: 'sell', positionId, type: 'market', ...body });
  /** A purchase and a sale at the prices given, on a day of March (Madrid noon). */
  const trade = async (u: TestUser, day: number, out: number, amount = 1000) => {
    ctx.clock.set(`2026-03-${String(day).padStart(2, '0')}T11:00:00Z`);
    ctx.market.prices.set('BTC', 50_000);
    const id = (await buy(u, { amount }).expect(201)).body.open[0].id as string;
    ctx.market.prices.set('BTC', out);
    await sell(u, id).expect(201);
  };
  const results = () =>
    ctx.container.db
      .prepare('SELECT * FROM crypto_sim_season_results ORDER BY season, place')
      .all() as Record<string, unknown>[];

  beforeEach(async () => {
    ctx = createTestApp({ now: '2026-03-15T12:00:00Z' });
    user = await createUser(ctx);
  });

  describe('monthly season', () => {
    it('freezes the month at its last price, cancels pending orders and starts again with 10.000 €', async () => {
      await buy(user).expect(201);
      await buy(user, { type: 'limit', price: 40_000, amount: 500 }).expect(201);
      // The last hour of March closes at 60.000; what happens after midnight does not count.
      ctx.market.setCandles('BTC', [
        hourly('2026-03-31T21:00:00Z', 60_000, 59_000),
        hourly('2026-03-31T22:00:00Z', 70_000, 30_000),
      ]);
      ctx.market.prices.set('BTC', 70_000);
      ctx.clock.set(APRIL_FIRST);

      const { body } = await me().get('/crypto/sim').expect(200);
      expect(body.portfolio).toMatchObject({ kind: 'season', season: '2026-04' });
      expect(body.account).toMatchObject({ initial: 10_000, cash: 10_000, feeBps: 10 });
      expect(body.open).toEqual([]);
      expect(body.pending).toEqual([]);
      expect(body.season).toMatchObject({ month: '2026-04', daysLeft: 29, endingSoon: false });
      // 8.498,50 € + 500,50 € reserved + 0,02 BTC sold at 60.000 minus 1,20 € of commission.
      expect(body.season.history).toEqual([
        {
          season: '2026-03',
          initial: 10_000,
          final: 10_197.8,
          percent: 1.98,
          trades: 0,
          wins: 0,
          activeDays: 1,
          qualified: false,
          ranked: false,
          place: null,
          prizeDays: 0,
        },
      ]);
      const march = ctx.container.repos.cryptoSim.seasonPortfolio(user.id, '2026-03')!;
      expect(march.closedAt).toBe('2026-03-31T22:30:00.000Z');
      const [closed] = ctx.container.repos.cryptoSim.positions(march.id);
      expect(closed).toMatchObject({
        closeType: 'season',
        exitPrice: 60_000,
        closedAt: '2026-03-31T21:59:59.000Z',
      });
      expect(body.badges.map((b: { id: string }) => b.id)).toEqual(['firstTrade', 'positiveMonth']);

      // Idempotent: the job and later looks change nothing.
      await ctx.container.cryptoRanking.run();
      await ctx.container.cryptoRanking.run();
      await me().get('/crypto/sim').expect(200);
      expect(results()).toHaveLength(1);
      expect(
        ctx.container.db
          .prepare("SELECT COUNT(*) AS n FROM crypto_sim_portfolios WHERE kind = 'season'")
          .get()
      ).toEqual({ n: 2 });
    });

    it('fills the pending orders reached before midnight, never the ones after', async () => {
      await buy(user, { type: 'limit', price: 45_000, amount: 500 }).expect(201);
      await buy(user, { type: 'limit', price: 1_500, amount: 500, symbol: 'ETH' }).expect(201);
      ctx.market.setCandles('BTC', [hourly('2026-03-20T10:00:00Z', 46_000, 44_000)]);
      ctx.market.setCandles('ETH', [hourly('2026-03-31T22:00:00Z', 2_000, 1)]);
      ctx.clock.set(APRIL_FIRST);
      await me().get('/crypto/sim').expect(200);
      const march = ctx.container.repos.cryptoSim.seasonPortfolio(user.id, '2026-03')!;
      const positions = ctx.container.repos.cryptoSim.positions(march.id);
      expect(positions).toHaveLength(1);
      expect(positions[0]).toMatchObject({ symbol: 'BTC', openType: 'limit', closeType: 'season' });
      expect(ctx.container.repos.cryptoSim.orders(march.id)).toEqual([]);
    });

    it('changes season at midnight in Madrid, whatever the time zone of the server', async () => {
      await buy(user).expect(201);
      ctx.clock.set('2026-03-31T21:59:59Z');
      const last = (await me().get('/crypto/sim').expect(200)).body;
      expect(last.season).toMatchObject({ month: '2026-03', daysLeft: 0, endingSoon: true });
      expect(last.open).toHaveLength(1);
      ctx.clock.set('2026-03-31T22:00:00Z');
      expect((await me().get('/crypto/sim').expect(200)).body.season.month).toBe('2026-04');
    });

    it('warns in the last three days', async () => {
      ctx.clock.set('2026-03-28T12:00:00Z');
      expect((await me().get('/crypto/sim').expect(200)).body.season).toMatchObject({
        daysLeft: 3,
        endingSoon: false,
      });
      ctx.clock.set('2026-03-29T12:00:00Z');
      expect((await me().get('/crypto/sim').expect(200)).body.season).toMatchObject({
        daysLeft: 2,
        endingSoon: true,
      });
    });

    it('waits for prices to close a season, and after a day uses the entry price', async () => {
      await buy(user).expect(201);
      ctx.market.down = true;
      ctx.clock.set(APRIL_FIRST);
      const waiting = (await me().get('/crypto/sim').expect(200)).body;
      expect(waiting.portfolio.season).toBe('2026-04');
      expect(waiting.season.history).toEqual([]);
      expect(await ctx.container.cryptoRanking.run()).toEqual({ closed: 0, rankings: 0 });
      ctx.clock.set('2026-04-01T23:00:00Z');
      expect((await ctx.container.cryptoRanking.run()).closed).toBe(1);
      // Without any price the operation ends as it started: only the two commissions.
      expect(results()[0]).toMatchObject({ final_cents: 999_800 });
    });

    it('closes the seasons of people who do not come back, and forgets empty ones', async () => {
      const other = await createUser(ctx);
      await buy(user).expect(201);
      await as(other).get('/crypto/sim').expect(200);
      ctx.clock.set(APRIL_FIRST);
      expect(await ctx.container.cryptoRanking.run()).toEqual({ closed: 2, rankings: 1 });
      expect(results().map((r) => r.user_id)).toEqual([user.id]);
    });

    it('deletes the operations of seasons older than a year, keeping their result', async () => {
      await buy(user).expect(201);
      ctx.clock.set(APRIL_FIRST);
      await ctx.container.cryptoRanking.run();
      ctx.clock.set('2027-03-15T12:00:00Z');
      await ctx.container.cryptoRanking.run();
      expect(ctx.container.repos.cryptoSim.seasonPortfolio(user.id, '2026-03')).not.toBeNull();
      ctx.clock.set('2027-04-15T12:00:00Z');
      await ctx.container.cryptoRanking.run();
      expect(ctx.container.repos.cryptoSim.seasonPortfolio(user.id, '2026-03')).toBeNull();
      expect(results()).toHaveLength(1);
    });

    it('keeps today’s equity every hour for the chart', async () => {
      await buy(user).expect(201);
      ctx.market.prices.set('BTC', 55_000);
      ctx.clock.set('2026-03-16T08:00:00Z');
      await ctx.container.cryptoRanking.run();
      const march = ctx.container.repos.cryptoSim.seasonPortfolio(user.id, '2026-03')!;
      expect(ctx.container.repos.cryptoSim.equityDays(march.id)).toEqual([
        { day: '2026-03-15', equityCents: 999_800 },
        { day: '2026-03-16', equityCents: 1_009_790 },
      ]);
      ctx.market.stale = true;
      expect(await ctx.container.cryptoSim.snapshotEquity()).toBe(0);
    });

    it('logs a season that cannot be closed and goes on with the others', async () => {
      await buy(user).expect(201);
      ctx.clock.set(APRIL_FIRST);
      const repo = ctx.container.repos.cryptoSim;
      const spy = jest.spyOn(repo, 'insertResult').mockImplementationOnce(() => {
        throw new Error('disk full');
      });
      const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(await ctx.container.cryptoSim.closeFinishedSeasons()).toBe(0);
      expect(errors).toHaveBeenCalled();
      spy.mockRestore();
      errors.mockRestore();
      expect(await ctx.container.cryptoSim.closeFinishedSeasons()).toBe(1);
    });
  });

  describe('practice portfolios', () => {
    it('one on the free plan: separate, 10.000 €, restarts and does not count', async () => {
      expireTrial(ctx, user);
      const official = (await me().get('/crypto/sim').expect(200)).body;
      expect(official.plan).toEqual({ premium: false, practiceMax: 1, practiceActionsLeft: 5 });
      const created = await me().post('/crypto/sim/practice').expect(201);
      const practice = created.body.portfolio;
      expect(practice).toMatchObject({ kind: 'practice', season: null });
      expect(created.body.account).toMatchObject({ initial: 10_000, cash: 10_000, feeBps: 10 });
      expect(created.body.portfolios.map((p: { kind: string }) => p.kind)).toEqual([
        'season',
        'practice',
      ]);
      expect(created.body.plan.practiceActionsLeft).toBe(4);
      const second = await me().post('/crypto/sim/practice').expect(402);
      expect(second.body).toMatchObject({ code: 'PLAN_LIMIT', details: { limit: 1 } });

      await buy(user, { portfolioId: practice.id, amount: 9000 }).expect(201);
      const seasonView = (await me().get('/crypto/sim').expect(200)).body;
      expect(seasonView.account.cash).toBe(10_000);
      const practiceView = (await me().get(`/crypto/sim?portfolio=${practice.id}`).expect(200))
        .body;
      expect(practiceView.open).toHaveLength(1);

      const reset = await me().post('/crypto/sim/reset', { portfolioId: practice.id }).expect(200);
      expect(reset.body.account).toMatchObject({ cash: 10_000, initial: 10_000 });
      expect(reset.body.open).toEqual([]);

      const deleted = await me().del(`/crypto/sim/practice/${practice.id}`).expect(200);
      expect(deleted.body.portfolio.kind).toBe('season');
      expect(deleted.body.portfolios).toHaveLength(1);
      await me().del(`/crypto/sim/practice/${practice.id}`).expect(404);
      // An old selection falls back to the official portfolio; writing to it is refused.
      expect(
        (await me().get(`/crypto/sim?portfolio=${practice.id}`).expect(200)).body.portfolio.kind
      ).toBe('season');
      const gone = await buy(user, { portfolioId: practice.id }).expect(404);
      expect(gone.body.code).toBe('CRYPTO_PORTFOLIO_NOT_FOUND');
      await me().del(`/crypto/sim/practice/${official.portfolio.id}`).expect(404);
    });

    it('limits restarts to five a day (Madrid)', async () => {
      const id = (await me().post('/crypto/sim/practice').expect(201)).body.portfolio.id;
      for (let i = 0; i < 4; i++)
        await me().post('/crypto/sim/reset', { portfolioId: id }).expect(200);
      const tired = await me().post('/crypto/sim/reset', { portfolioId: id }).expect(400);
      expect(tired.body.code).toBe('CRYPTO_PRACTICE_DAILY');
      ctx.clock.set('2026-03-15T23:30:00Z');
      await me().post('/crypto/sim/reset', { portfolioId: id }).expect(200);
    });

    it('up to five with Premium, and they outlive the season', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        ids.push((await me().post('/crypto/sim/practice').expect(201)).body.portfolio.id);
      }
      const sixth = await me().post('/crypto/sim/practice').expect(400);
      expect(sixth.body.code).toBe('CRYPTO_PRACTICE_LIMIT');
      await buy(user, { portfolioId: ids[0] }).expect(201);
      ctx.clock.set(APRIL_FIRST);
      const april = (await me().get(`/crypto/sim?portfolio=${ids[0]}`).expect(200)).body;
      expect(april.portfolio.id).toBe(ids[0]);
      expect(april.open).toHaveLength(1);
      expect(results()).toEqual([]);
    });

    it('the official season never restarts, and its «no balance» points to practice', async () => {
      const reset = await me().post('/crypto/sim/reset', {}).expect(400);
      expect(reset.body.code).toBe('CRYPTO_SEASON_NO_RESET');
      const broke = await buy(user, { amount: 9999 }).expect(400);
      expect(broke.body).toMatchObject({ code: 'CRYPTO_NO_BALANCE', details: { kind: 'season' } });
      expect(broke.body.error).toContain('cartera de prácticas');
      const id = (await me().post('/crypto/sim/practice').expect(201)).body.portfolio.id;
      const practice = await buy(user, { portfolioId: id, amount: 9999 }).expect(400);
      expect(practice.body.details).toEqual({ kind: 'practice' });
    });

    it('keeps each person’s portfolios apart', async () => {
      const other = await createUser(ctx);
      const id = (await me().post('/crypto/sim/practice').expect(201)).body.portfolio.id;
      await buy(other, { portfolioId: id }).expect(404);
      await as(other).post('/crypto/sim/reset', { portfolioId: id }).expect(400);
      await as(other).del(`/crypto/sim/practice/${id}`).expect(404);
      expect(
        (await as(other).get(`/crypto/sim?portfolio=${id}`).expect(200)).body.portfolio.id
      ).not.toBe(id);
      await me().get('/crypto/sim?portfolio=nope').expect(400);
    });
  });

  describe('voluntary ranking', () => {
    it('is off by default and proposes the first name as the alias', async () => {
      const { body } = await me().get('/crypto/ranking').expect(200);
      expect(body.settings).toEqual({ optIn: false, alias: null, suggestedAlias: 'Test' });
      expect(body.top).toEqual([]);
      expect(body.previous).toBeNull();
      expect(body.me).toMatchObject({ place: null, trades: 0, qualified: false });
      expect(body.me.missing).toEqual({ trades: 5, days: 3 });
      expect(body.rules).toEqual({
        size: 5,
        minTrades: 5,
        minDays: 3,
        prizeDays: 30,
        initial: 10_000,
        aliasMin: 3,
        aliasMax: 20,
      });
      expect(body.season).toEqual({
        month: '2026-03',
        endsAt: '2026-03-31T22:00:00.000Z',
        daysLeft: 16,
      });
      const on = await me().put('/crypto/ranking/settings', { optIn: true }).expect(200);
      expect(on.body.settings).toMatchObject({ optIn: true, alias: 'Test' });
      const off = await me().put('/crypto/ranking/settings', { optIn: false }).expect(200);
      expect(off.body.settings).toMatchObject({ optIn: false, alias: 'Test' });
    });

    it('checks the alias: length, no e-mails, links, phones or offensive words', async () => {
      const bad = async (alias: string, problem: string) => {
        const res = await me().put('/crypto/ranking/settings', { optIn: true, alias }).expect(400);
        expect(res.body).toMatchObject({ code: 'CRYPTO_ALIAS_INVALID', details: { problem } });
      };
      await bad('ab', 'length');
      await bad('a'.repeat(21), 'length');
      await bad('ana@correo.es', 'contact');
      await bad('www.miweb', 'contact');
      await bad('mi.web.com', 'contact');
      await bad('llama 600123456', 'contact');
      await bad('<b>hola</b>', 'characters');
      await bad('Put4 madre', 'words');
      await bad('gilipollas', 'words');
      await me().put('/crypto/ranking/settings', { optIn: true, alias: 123 }).expect(400);
      const ok = await me()
        .put('/crypto/ranking/settings', { optIn: false, alias: '  Lince   Ibérico ' })
        .expect(200);
      expect(ok.body.settings.alias).toBe('Lince Ibérico');
    });

    it('asks for an alias when the name cannot be one', async () => {
      ctx.container.db.prepare('UPDATE users SET name = ? WHERE id = ?').run('X', user.id);
      const res = await me().put('/crypto/ranking/settings', { optIn: true }).expect(400);
      expect(res.body.details).toEqual({ problem: 'length' });
    });

    it('ranks the month live with minimums and ties, showing only aliases', async () => {
      const [ana, bea, cris, dani] = [
        user,
        await createUser(ctx),
        await createUser(ctx),
        await createUser(ctx),
      ];
      const optIn = (u: TestUser, alias: string) =>
        as(u).put('/crypto/ranking/settings', { optIn: true, alias }).expect(200);
      await optIn(ana, 'Alfa');
      await optIn(bea, 'Beta');
      await optIn(cris, 'Gamma');
      // Ana: +10 % twice (5 trades, 3 days). Bea: the same result, one day later. Cris: 4 trades.
      // Dani gains most but did not ask to appear.
      for (const [u, days] of [
        [ana, [2, 2, 3, 4, 4]],
        [bea, [3, 3, 4, 5, 5]],
        [cris, [2, 3, 4, 4]],
        [dani, [2, 3, 4, 5, 6]],
      ] as const) {
        for (const [i, day] of days.entries()) {
          await trade(u, day, i < 2 ? 55_000 : 50_000);
        }
      }
      await trade(dani, 7, 80_000);
      ctx.clock.set('2026-03-20T12:00:00Z');
      ctx.market.prices.set('BTC', 50_000);
      const { body, text } = await as(bea).get('/crypto/ranking').expect(200);
      expect(body.top).toEqual([
        { place: 1, alias: 'Alfa', percent: 1.9, trades: 5, premium: true },
        { place: 2, alias: 'Beta', percent: 1.9, trades: 5, premium: true },
      ]);
      expect(body.participants).toBe(2);
      expect(body.me).toMatchObject({ place: 2, percent: 1.9, trades: 5, qualified: true });
      for (const secret of [ana.id, bea.id, dani.id, 'example.com', 'Test User']) {
        expect(text).not.toContain(secret);
      }
      const gamma = (await as(cris).get('/crypto/ranking').expect(200)).body.me;
      expect(gamma).toMatchObject({
        place: null,
        qualified: false,
        missing: { trades: 1, days: 0 },
      });
      // Cached for a minute; turning it off takes effect at once.
      await as(ana).put('/crypto/ranking/settings', { optIn: false }).expect(200);
      expect((await as(bea).get('/crypto/ranking').expect(200)).body.top).toHaveLength(1);
    });

    it('on the 1st freezes the top 5 and gives the winner one month of Premium, once', async () => {
      const players = [user, ...(await Promise.all([1, 2, 3, 4, 5].map(() => createUser(ctx))))];
      for (const [i, u] of players.entries()) {
        await as(u)
          .put('/crypto/ranking/settings', { optIn: true, alias: `Jugador ${i}` })
          .expect(200);
        for (const day of [2, 3, 4, 5, 6]) await trade(u, day, 50_000 + i * 1000);
      }
      ctx.market.prices.set('BTC', 50_000);
      ctx.clock.set(APRIL_FIRST);
      const winner = players[5];
      await as(winner).post('/push/subscribe', PUSH).expect(204);
      const sub = () => ctx.container.repos.subscriptions.get(winner.id)!;
      expect(await ctx.container.cryptoRanking.run()).toEqual({ closed: 6, rankings: 1 });
      // The trial had ended: the month starts today.
      const after = sub().trialEndsAt!;
      expect(Date.parse(after) - Date.parse(APRIL_FIRST)).toBe(30 * 24 * 60 * 60 * 1000);
      const places = results().map((r) => [r.alias, r.place, r.prize_days]);
      expect(places.filter((p) => p[1] !== null)).toEqual([
        ['Jugador 5', 1, 30],
        ['Jugador 4', 2, 0],
        ['Jugador 3', 3, 0],
        ['Jugador 2', 4, 0],
        ['Jugador 1', 5, 0],
      ]);
      expect(ctx.push.sent.map((s) => s.payload)).toEqual([
        {
          title: 'Has ganado 1 mes de Premium',
          body: 'Has quedado primero en el ranking de la consola crypto de marzo de 2026. Ya tienes tu mes de Premium de regalo.',
          url: '/?tab=crypto',
        },
      ]);
      await ctx.container.cryptoRanking.run();
      expect(sub().trialEndsAt).toBe(after);
      expect(ctx.push.sent).toHaveLength(1);

      const view = (await as(players[1]).get('/crypto/ranking').expect(200)).body;
      expect(view.previous.month).toBe('2026-03');
      expect(view.previous.top[0]).toEqual({
        place: 1,
        alias: 'Jugador 5',
        percent: expect.any(Number),
        trades: 5,
        premium: false,
      });
      expect(view.previous.top[0].percent).toBeGreaterThan(view.previous.top[1].percent);
      const history = (await as(winner).get('/crypto/sim').expect(200)).body.season.history[0];
      expect(history).toMatchObject({ place: 1, prizeDays: 30, qualified: true, ranked: true });
    });

    it('adds the prize after a paid period and tells nobody when push is off', async () => {
      const app = createTestApp({ now: '2026-03-15T12:00:00Z', pushEnabled: false });
      ctx = app;
      const winner = await createUser(ctx);
      user = winner;
      await me().put('/crypto/ranking/settings', { optIn: true, alias: 'Campeón' }).expect(200);
      for (const day of [2, 3, 4, 5, 6]) await trade(winner, day, 51_000);
      const sub = ctx.container.repos.subscriptions.get(winner.id)!;
      ctx.container.repos.subscriptions.save({
        ...sub,
        status: 'active',
        source: 'stripe',
        trialEndsAt: null,
        currentPeriodEnd: '2026-04-20T00:00:00.000Z',
      });
      ctx.clock.set(APRIL_FIRST);
      await ctx.container.cryptoRanking.run();
      expect(ctx.container.repos.subscriptions.get(winner.id)!.trialEndsAt).toBe(
        '2026-05-20T00:00:00.000Z'
      );
      expect(ctx.push.sent).toEqual([]);
    });

    it('gives nothing more to a lifetime member but keeps the place', async () => {
      await me().put('/crypto/ranking/settings', { optIn: true, alias: 'Eterno' }).expect(200);
      for (const day of [2, 3, 4, 5, 6]) await trade(user, day, 51_000);
      const sub = ctx.container.repos.subscriptions.get(user.id)!;
      ctx.container.repos.subscriptions.save({ ...sub, lifetime: true });
      ctx.clock.set(APRIL_FIRST);
      await ctx.container.cryptoRanking.run();
      expect(results()[0]).toMatchObject({ place: 1, prize_days: 0 });
    });

    it('does not fail the job when the winner cannot be told', async () => {
      await me().put('/crypto/ranking/settings', { optIn: true, alias: 'Ganador' }).expect(200);
      for (const day of [2, 3, 4, 5, 6]) await trade(user, day, 51_000);
      await me().post('/push/subscribe', PUSH).expect(204);
      const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      jest.spyOn(ctx.container.push, 'notify').mockRejectedValueOnce(new Error('push down'));
      ctx.container.db
        .prepare("UPDATE user_settings SET locale = 'en' WHERE user_id = ?")
        .run(user.id);
      ctx.clock.set(APRIL_FIRST);
      expect((await ctx.container.cryptoRanking.run()).rankings).toBe(1);
      expect(errors).toHaveBeenCalledWith('[crypto] could not tell the winner', expect.any(Error));
      errors.mockRestore();
    });
  });

  describe('Premium comforts', () => {
    it('advanced statistics only with Premium', async () => {
      ctx.market.setCandles('BTC', [hourly('2026-03-15T11:00:00Z', 40_000)]);
      for (const out of [55_000, 45_000]) {
        const id = (await buy(user).expect(201)).body.open[0].id;
        ctx.market.prices.set('BTC', out);
        await sell(user, id).expect(201);
        ctx.market.prices.set('BTC', 50_000);
      }
      const { body } = await me().get('/crypto/sim').expect(200);
      expect(body.plan.premium).toBe(true);
      expect(body.stats).toMatchObject({
        winRate: 50,
        wins: 1,
        losses: 1,
        best: { symbol: 'BTC', pnl: 97.9 },
        worst: { symbol: 'BTC', pnl: -101.9 },
        averageWin: 97.9,
        averageLoss: -101.9,
        hold: { symbol: 'BTC', startPrice: 40_000, price: 50_000, percent: 25 },
      });
      expect(body.stats.equityDays).toEqual([{ day: '2026-03-15', equity: 9996 }]);
      ctx.market.setCandles('BTC', []);
      expect((await me().get('/crypto/sim').expect(200)).body.stats.hold).toBeNull();
      expireTrial(ctx, user);
      expect((await me().get('/crypto/sim').expect(200)).body.stats).toBeNull();
    });

    it('has no statistics of holding without prices or candles', async () => {
      ctx.market.prices.delete('BTC');
      expect((await me().get('/crypto/sim').expect(200)).body.stats.hold).toBeNull();
      ctx.market.prices.set('BTC', 50_000);
      ctx.market.down = true;
      expect((await me().get('/crypto/sim').expect(200)).body.stats).toMatchObject({
        hold: null,
        best: null,
        averageWin: null,
      });
    });

    it('season report: Premium only, for the month or a finished one', async () => {
      const id = (await buy(user).expect(201)).body.open[0].id;
      await sell(user, id).expect(201);
      const now = await me().get('/crypto/seasons/2026-03/report').expect(200);
      expect(now.body).toMatchObject({
        season: '2026-03',
        finished: false,
        initial: 10_000,
        result: null,
      });
      expect(now.body.closed).toHaveLength(1);
      await me().get('/crypto/seasons/2026-13/report').expect(400);
      expect((await me().get('/crypto/seasons/2025-01/report').expect(404)).body.code).toBe(
        'CRYPTO_SEASON_NOT_FOUND'
      );
      ctx.clock.set(APRIL_FIRST);
      ctx.container.entitlements.grantDays(user.id, 30);
      const past = await me().get('/crypto/seasons/2026-03/report').expect(200);
      expect(past.body).toMatchObject({ finished: true, result: { season: '2026-03', trades: 1 } });
      expireTrial(ctx, user);
      const locked = await me().get('/crypto/seasons/2026-03/report').expect(402);
      expect(locked.body).toMatchObject({
        code: 'PREMIUM_REQUIRED',
        details: { feature: 'cryptoPro' },
      });
    });

    it('price alerts: up to 10, sent once as a service notification', async () => {
      await me().post('/push/subscribe', PUSH).expect(204);
      const created = await me()
        .post('/crypto/alerts', { symbol: 'BTC', condition: 'above', price: 52_000 })
        .expect(201);
      expect(created.body).toMatchObject({ max: 10, pushEnabled: true });
      expect(created.body.alerts[0]).toMatchObject({
        symbol: 'BTC',
        condition: 'above',
        triggeredAt: null,
      });
      await me()
        .post('/crypto/alerts', { symbol: 'ETH', condition: 'below', price: 1500 })
        .expect(201);
      await me()
        .post('/crypto/alerts', { symbol: 'XXX', condition: 'below', price: 1 })
        .expect(400);
      expect(await ctx.container.cryptoAlerts.run()).toBe(0);
      ctx.market.prices.set('BTC', 53_000);
      ctx.market.prices.set('ETH', 1400);
      expect(await ctx.container.cryptoAlerts.run()).toBe(2);
      expect(await ctx.container.cryptoAlerts.run()).toBe(0);
      expect(ctx.push.sent.map((s) => s.payload.body.replace(/\u00a0/g, ' '))).toEqual([
        'Bitcoin ha llegado a 52.000 € o más. Es solo un aviso, no una recomendación.',
        'Ethereum ha bajado a 1500 € o menos. Es solo un aviso, no una recomendación.',
      ]);
      const list = (await me().get('/crypto/alerts').expect(200)).body.alerts;
      expect(list.every((a: { triggeredAt: string | null }) => a.triggeredAt !== null)).toBe(true);
      for (let i = 0; i < 10; i++) {
        await me()
          .post('/crypto/alerts', { symbol: 'BTC', condition: 'above', price: 90_000 + i })
          .expect(201);
      }
      const full = await me()
        .post('/crypto/alerts', { symbol: 'BTC', condition: 'above', price: 99_000 })
        .expect(400);
      expect(full.body.code).toBe('CRYPTO_TOO_MANY_ALERTS');
      const removed = await me().del(`/crypto/alerts/${list[0].id}`).expect(200);
      expect(removed.body.alerts).toHaveLength(11);
      await me().del(`/crypto/alerts/${list[0].id}`).expect(404);
      // Old sent alerts go after 30 days.
      ctx.clock.set('2026-04-20T12:00:00Z');
      ctx.container.entitlements.grantDays(user.id, 30);
      await ctx.container.cryptoRanking.run();
      expect((await me().get('/crypto/alerts').expect(200)).body.alerts).toHaveLength(10);
    });

    it('alerts are Premium; nothing goes out without Premium, push or fresh prices', async () => {
      await me().post('/push/subscribe', PUSH).expect(204);
      await me()
        .post('/crypto/alerts', { symbol: 'BTC', condition: 'below', price: 49_000 })
        .expect(201);
      ctx.container.db
        .prepare("UPDATE user_settings SET locale = 'en' WHERE user_id = ?")
        .run(user.id);
      ctx.market.prices.set('BTC', 48_000);
      ctx.market.stale = true;
      expect(await ctx.container.cryptoAlerts.run()).toBe(0);
      ctx.market.stale = false;
      ctx.market.down = true;
      expect(await ctx.container.cryptoAlerts.run()).toBe(0);
      ctx.market.down = false;
      expireTrial(ctx, user);
      expect(await ctx.container.cryptoAlerts.run()).toBe(0);
      expect((await me().get('/crypto/alerts').expect(402)).body.code).toBe('PREMIUM_REQUIRED');
      await me()
        .post('/crypto/alerts', { symbol: 'BTC', condition: 'below', price: 1 })
        .expect(402);
      ctx.container.entitlements.grantDays(user.id, 5);
      const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      jest.spyOn(ctx.container.push, 'notify').mockRejectedValueOnce(new Error('down'));
      expect(await ctx.container.cryptoAlerts.run()).toBe(0);
      errors.mockRestore();
      const off = createTestApp({ pushEnabled: false });
      expect(await off.container.cryptoAlerts.run()).toBe(0);
    });

    it('writes alerts in English for English speakers', async () => {
      await me().post('/push/subscribe', PUSH).expect(204);
      ctx.container.db
        .prepare("UPDATE user_settings SET locale = 'en' WHERE user_id = ?")
        .run(user.id);
      await me()
        .post('/crypto/alerts', { symbol: 'SOL', condition: 'above', price: 100 })
        .expect(201);
      ctx.market.prices.set('SOL' as never, 120);
      expect(await ctx.container.cryptoAlerts.run()).toBe(1);
      expect(ctx.push.sent[0].payload).toEqual({
        title: 'The price alert you asked for',
        body: 'Solana has reached €100 or more. Only a notice, not a recommendation.',
        url: '/?tab=crypto',
      });
    });
  });

  describe('badges', () => {
    it('first take profit and ten operations', async () => {
      ctx.market.setCandles('BTC', [hourly('2026-03-15T13:00:00Z', 61_000, 60_000, 61_000)]);
      await buy(user, { takeProfit: 60_000 }).expect(201);
      ctx.clock.set('2026-03-15T14:30:00Z');
      const filled = (await me().get('/crypto/sim').expect(200)).body;
      expect(filled.badges.map((b: { id: string }) => b.id)).toEqual([
        'firstTrade',
        'firstTakeProfit',
      ]);
      ctx.market.setCandles('BTC', []);
      for (let i = 0; i < 9; i++) {
        const id = (await buy(user).expect(201)).body.open[0].id;
        await sell(user, id).expect(201);
      }
      const ten = (await me().get('/crypto/sim').expect(200)).body.badges;
      expect(ten.map((b: { id: string }) => b.id)).toContain('tenTrades');
    });
  });

  describe('personal data', () => {
    it('exports the ranking settings, results and alerts, and deletes them with the account', async () => {
      await me().put('/crypto/ranking/settings', { optIn: true, alias: 'Lince' }).expect(200);
      await buy(user).expect(201);
      await me()
        .post('/crypto/alerts', { symbol: 'BTC', condition: 'above', price: 90_000 })
        .expect(201);
      ctx.clock.set(APRIL_FIRST);
      await ctx.container.cryptoRanking.run();
      const exported = (await me().get('/export').expect(200)).body.cryptoSimulator;
      expect(exported.ranking).toMatchObject({ appearInRanking: true, alias: 'Lince' });
      expect(exported.seasonResults).toEqual([
        expect.objectContaining({ season: '2026-03', appearedInRanking: true, alias: 'Lince' }),
      ]);
      expect(exported.portfolios[0].equityByDay[0]).toMatchObject({ day: '2026-03-15' });
      expect(exported.priceAlerts).toEqual([
        expect.objectContaining({ symbol: 'BTC', condition: 'above', price: 90_000 }),
      ]);
      await request(ctx.app)
        .delete('/api/profile/account')
        .set(user.auth)
        .send({ password: STRONG_PASSWORD })
        .expect(204);
      for (const table of [
        'crypto_sim_profiles',
        'crypto_sim_season_results',
        'crypto_sim_alerts',
        'crypto_sim_portfolios',
      ]) {
        expect(ctx.container.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({
          n: 0,
        });
      }
    });
  });

  describe('migration 039', () => {
    it('keeps every balance, operation and order as the official portfolio of the month', () => {
      const db = openDatabase(':memory:');
      migrate(
        db,
        migrations.filter((m) => m.version < 39)
      );
      db.exec(`
        INSERT INTO users (id, email, name, password_hash, created_at, email_verified)
          VALUES ('u1', 'u1@example.com', 'Uno', 'x', '2026-01-01T00:00:00Z', 1),
                 ('u2', 'u2@example.com', 'Dos', 'x', '2026-01-01T00:00:00Z', 1);
        INSERT INTO crypto_sim_accounts (user_id, initial_cents, cash_cents, fee_bps, started_at)
          VALUES ('u1', 10000000, 9000000, 50, '2026-10-02T10:00:00Z');
        INSERT INTO crypto_sim_positions (id, user_id, symbol, direction, quantity, entry_price,
          amount_cents, entry_fee_cents, open_type, opened_at)
          VALUES ('p1', 'u1', 'BTC', 'short', 0.1, 50000, 500000, 2500, 'market', '2026-10-03T10:00:00Z');
        INSERT INTO crypto_sim_orders (id, user_id, symbol, side, direction, type, price,
          amount_cents, reserved_cents, position_id, created_at)
          VALUES ('o1', 'u1', 'BTC', 'buy', 'short', 'stop', 60000, NULL, 0, 'p1', '2026-10-03T10:00:00Z');
      `);
      migrate(db, [
        ...migrations.filter((m) => m.version < 39),
        cryptoSeasonsMigration(() => new Date('2026-10-31T23:30:00Z')),
      ]);
      const [portfolio] = db.prepare('SELECT * FROM crypto_sim_portfolios').all() as Record<
        string,
        unknown
      >[];
      // 00:30 on 1 November in Madrid: the migration names the season in Spanish time.
      expect(portfolio).toMatchObject({
        user_id: 'u1',
        kind: 'season',
        season: '2026-11',
        initial_cents: 10_000_000,
        cash_cents: 9_000_000,
        fee_bps: 10,
        closed_at: null,
      });
      expect(db.prepare('SELECT portfolio_id FROM crypto_sim_positions').get()).toEqual({
        portfolio_id: portfolio.id,
      });
      expect(db.prepare('SELECT portfolio_id, position_id FROM crypto_sim_orders').get()).toEqual({
        portfolio_id: portfolio.id,
        position_id: 'p1',
      });
      expect(db.pragma('foreign_key_check')).toEqual([]);
    });
  });
});
