import { randomUUID } from 'crypto';
import {
  BusinessRuleError,
  NotFoundError,
  PaymentRequiredError,
  UnavailableError,
} from '@domain/errors';
import {
  CryptoSeasonResult,
  CryptoSimOrder,
  CryptoSimPortfolio,
  CryptoSimPosition,
  CryptoSimProfile,
  CryptoSimRepository,
  UnitOfWork,
} from '@domain/ports/repositories';
import { Clock, CryptoMarketData } from '@domain/ports/services';
import {
  CANDLES_PER_SERIES,
  CryptoSymbol,
  INTERVAL_MS,
  MarketCandle,
  MarketFeed,
  MarketTicker,
  isCryptoSymbol,
} from '@domain/services/crypto-market';
import {
  DEFAULT_FEE_BPS,
  Fill,
  MAX_OPEN_POSITIONS,
  MAX_POSITIONS,
  OrderType,
  PENDING_DAYS,
  PENDING_MS,
  PendingType,
  CloseType,
  Direction,
  feeCents,
  liquidationPrice,
  sideOf,
  findFill,
  fillsNow,
  firstFill,
  performance,
  PendingLike,
  resolutionFor,
  sale,
} from '@domain/services/crypto-sim';
import {
  BadgeId,
  PENDING_MAX,
  PRACTICE_ACTIONS_PER_DAY,
  PRACTICE_INITIAL_CENTS,
  PRACTICE_MAX,
  SEASON_INITIAL_CENTS,
  SEASON_WARNING_DAYS,
  activity,
  daysLeft,
  madridDay,
  madridMonth,
  monthStartsAt,
  qualifies,
  rankingAlias,
  returnPercent,
  seasonEndsAt,
} from '@domain/services/crypto-season';
import { Cents, fromCents } from '@domain/shared/money';

/** Whether a person has Premium now (comforts of the console, never an edge in the ranking). */
export interface CryptoPlan {
  isPremium(userId: string): boolean;
}

/** A purchase (euros to invest) or a sale; pending orders (limit, stop) always carry `price` (zod). */
export type CryptoOrderInput =
  | {
      action: 'buy';
      symbol: CryptoSymbol;
      /** Long (the default) or short, always 1x. */
      direction?: Direction;
      type: OrderType;
      amountCents: Cents;
      price?: number;
      /** Sell if the price goes up to this (a linked limit sale). */
      takeProfit?: number;
      /** Sell if the price goes down to this (a linked stop sale). */
      stopLoss?: number;
    }
  | { action: 'sell'; positionId: string; type: OrderType; price?: number };

/** New take profit and stop loss of an open position: a price sets or moves it, null removes it. */
export interface CryptoExitsInput {
  takeProfit?: number | null;
  stopLoss?: number | null;
}

export interface CryptoFillView {
  /** The order, or the position closed because its guarantee ran out. */
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  direction: Direction;
  type: PendingType | 'liquidation' | 'expired';
  price: number | null;
  at: string;
}

type TradeType = 'market' | 'limit' | 'stop';

export interface CryptoOpenView {
  id: string;
  symbol: string;
  direction: Direction;
  quantity: number;
  entryPrice: number;
  /** A short closes by itself here (its guarantee is used up); null for longs. */
  liquidationPrice: number | null;
  invested: number;
  entryFee: number;
  openType: TradeType;
  openedAt: string;
  /** Null while the market data is not available. */
  currentPrice: number | null;
  /** What selling now would give, after the commission. */
  value: number | null;
  exitFee: number | null;
  pnl: number | null;
  pnlPercent: number | null;
}

export interface CryptoPendingView {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  direction: Direction;
  type: PendingType;
  price: number;
  amount: number | null;
  reserved: number;
  positionId: string | null;
  /** Take profit and stop loss that a pending purchase will leave once filled. */
  takeProfit: number | null;
  stopLoss: number | null;
  createdAt: string;
  expiresAt: string;
  currentPrice: number | null;
}

export interface CryptoClosedView {
  id: string;
  symbol: string;
  direction: Direction;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  invested: number;
  fees: number;
  proceeds: number;
  pnl: number;
  pnlPercent: number;
  openType: TradeType;
  closeType: TradeType | 'liquidation' | 'season';
  openedAt: string;
  closedAt: string;
}

export interface CryptoPortfolioRef {
  id: string;
  kind: 'season' | 'practice';
  /** YYYY-MM of an official portfolio; null for practice. */
  season: string | null;
  startedAt: string;
}

export interface CryptoSeasonResultView {
  season: string;
  initial: number;
  final: number;
  percent: number;
  trades: number;
  wins: number;
  activeDays: number;
  /** It met the minimums of the ranking (5 operations, 3 days). */
  qualified: boolean;
  /** It had asked to appear in the ranking. */
  ranked: boolean;
  /** 1-5 when it entered the top 5. */
  place: number | null;
  /** Premium days won (the winner of the month). */
  prizeDays: number;
}

export interface CryptoTradeHighlight {
  symbol: string;
  direction: Direction;
  pnl: number;
  pnlPercent: number;
  closedAt: string;
}

/** Advanced statistics of the portfolio (Premium): the same data, more ways to look at it. */
export interface CryptoStatsView {
  winRate: number | null;
  wins: number;
  losses: number;
  best: CryptoTradeHighlight | null;
  worst: CryptoTradeHighlight | null;
  averageWin: number | null;
  averageLoss: number | null;
  /** Equity at the end of each day (Madrid) since the portfolio started. */
  equityDays: { day: string; equity: number }[];
  /** What keeping the most used coin since the start would have given (no commissions). */
  hold: { symbol: string; startPrice: number; price: number; percent: number } | null;
}

export interface CryptoSimView {
  portfolio: CryptoPortfolioRef;
  portfolios: CryptoPortfolioRef[];
  account: {
    initial: number;
    cash: number;
    reserved: number;
    feeBps: number;
    startedAt: string;
  };
  open: CryptoOpenView[];
  pending: CryptoPendingView[];
  closed: CryptoClosedView[];
  summary: {
    equity: number | null;
    realized: number;
    unrealized: number | null;
    total: number | null;
    totalPercent: number | null;
    trades: number;
    wins: number;
    losses: number;
    winRate: number | null;
  };
  season: {
    month: string;
    startsAt: string;
    endsAt: string;
    daysLeft: number;
    /** The last days: a new season is coming. */
    endingSoon: boolean;
    /** Finished seasons, newest first (up to 12). */
    history: CryptoSeasonResultView[];
  };
  plan: {
    premium: boolean;
    practiceMax: number;
    /** New or restarted practice portfolios still possible today. */
    practiceActionsLeft: number;
  };
  badges: { id: BadgeId; earnedAt: string }[];
  /** Premium only (null otherwise). */
  stats: CryptoStatsView | null;
  market: {
    available: boolean;
    stale: boolean;
    updatedAt: string | null;
    source: 'binance' | 'demo';
  };
  /** Pending orders filled (or expired) while answering this request. */
  fills: CryptoFillView[];
  limits: { pending: number; open: number; operations: number; pendingDays: number };
}

export interface CryptoSeasonReportView {
  season: string;
  finished: boolean;
  initial: number;
  result: CryptoSeasonResultView | null;
  closed: CryptoClosedView[];
  stats: CryptoStatsView;
}

type Prices = Map<string, number>;
type Tickers = MarketFeed<MarketTicker[]> | null;

/** A season ends: if the prices are missing this long after, the entry price is used. */
const CLOSE_PRICE_PATIENCE_MS = 24 * 60 * 60 * 1000;
const HISTORY_SEASONS = 12;

/**
 * The crypto simulator: play-money portfolios (the official one of each monthly season and
 * practice ones), purchases and sales at market price, and pending orders (limit and stop) filled
 * when the price reaches them. Pending orders are resolved whenever a portfolio is read, with the
 * candles since they were placed and the last price, so the same candles always give the same
 * result. On the 1st of every month (Spain) the official portfolio is frozen at the last price of
 * the month and a new one starts with 10.000 €. Play money only: nothing leaves the server.
 */
export class CryptoSimService {
  constructor(
    private readonly repo: CryptoSimRepository,
    private readonly market: CryptoMarketData,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly plan: CryptoPlan,
    private readonly logger: Pick<Console, 'error'> = console
  ) {}

  /** The portfolio asked for (the official one when missing, finished or not given). */
  async portfolio(userId: string, portfolioId?: string): Promise<CryptoSimView> {
    await this.ensureSeason(userId);
    const portfolio = this.pick(userId, portfolioId);
    const tickers = await this.tickers();
    const fills = await this.resolve(portfolio, tickers);
    return this.view(userId, portfolio.id, tickers, fills);
  }

  async place(
    userId: string,
    input: CryptoOrderInput,
    portfolioId?: string
  ): Promise<CryptoSimView> {
    await this.ensureSeason(userId);
    const portfolio = this.writable(userId, portfolioId);
    const tickers = await this.tickers();
    const fills = await this.resolve(portfolio, tickers);
    if (!tickers || tickers.stale) {
      throw new UnavailableError(
        'Los precios no están al día ahora mismo. Inténtalo en unos minutos.',
        'CRYPTO_PRICES_STALE'
      );
    }
    const prices = priceMap(tickers);
    const at = this.clock.now().toISOString();
    this.uow.run(() => {
      const fresh = this.fresh(portfolio);
      if (input.action === 'buy') this.buy(fresh, input, priceOf(prices, input.symbol), at);
      else this.sell(fresh, input, prices, at);
    });
    return this.view(userId, portfolio.id, tickers, fills);
  }

  /**
   * Sets, moves or removes the take profit and the stop loss of an open position (its linked
   * limit and stop orders, which are not shown among the pending ones). Checked against the
   * current price: a long's take profit above it and its stop loss below; a short's, the other
   * way round.
   */
  async setExits(
    userId: string,
    positionId: string,
    input: CryptoExitsInput
  ): Promise<CryptoSimView> {
    await this.ensureSeason(userId);
    const found = this.repo.position(userId, positionId);
    if (!found || found.closedAt) {
      throw new NotFoundError('Esa posición ya no está abierta', 'CRYPTO_POSITION_NOT_FOUND');
    }
    const portfolio = this.writable(userId, found.portfolioId);
    const tickers = await this.tickers();
    const fills = await this.resolve(portfolio, tickers);
    if (!tickers || tickers.stale) {
      throw new UnavailableError(
        'Los precios no están al día ahora mismo. Inténtalo en unos minutos.',
        'CRYPTO_PRICES_STALE'
      );
    }
    const prices = priceMap(tickers);
    const at = this.clock.now().toISOString();
    this.uow.run(() => {
      // The price may have just reached one of its exits while resolving.
      const position = this.repo.position(userId, positionId)!;
      if (position.closedAt) {
        throw new NotFoundError('Esa posición ya no está abierta', 'CRYPTO_POSITION_NOT_FOUND');
      }
      const current = priceOf(prices, position.symbol);
      const orders = this.repo.orders(portfolio.id).filter((o) => o.positionId === position.id);
      const changes: [PendingType, number | null | undefined][] = [
        ['limit', input.takeProfit],
        ['stop', input.stopLoss],
      ];
      for (const [type, price] of changes) {
        if (price === undefined) continue;
        const existing = orders.find((o) => o.type === type);
        if (existing?.price === price) continue;
        if (price !== null) this.checkExit(position.direction, type, price, current);
        if (existing) this.repo.deleteOrder(userId, existing.id);
        if (price !== null) this.insertExits(position, [{ type, price }], at);
      }
    });
    return this.view(userId, portfolio.id, tickers, fills);
  }

  async cancel(userId: string, orderId: string): Promise<CryptoSimView> {
    const portfolioId = this.uow.run(() => {
      const order = this.repo.order(userId, orderId);
      if (!order || !this.repo.deleteOrder(userId, orderId)) {
        throw new NotFoundError('Esa orden ya no está pendiente', 'CRYPTO_ORDER_NOT_FOUND');
      }
      this.refund(order.portfolioId, userId, order.reservedCents);
      return order.portfolioId;
    });
    return this.portfolio(userId, portfolioId);
  }

  /** A new practice portfolio with 10.000 € (one on the free plan, five with Premium). */
  async createPractice(userId: string): Promise<CryptoSimView> {
    await this.ensureSeason(userId);
    const premium = this.plan.isPremium(userId);
    const id = this.uow.run(() => {
      const count = this.repo.portfolios(userId).filter((p) => p.kind === 'practice').length;
      const max = premium ? PRACTICE_MAX.premium : PRACTICE_MAX.free;
      if (count >= max) {
        if (!premium) {
          throw new PaymentRequiredError(
            'PLAN_LIMIT',
            `En el plan gratuito puedes tener ${PRACTICE_MAX.free} cartera de prácticas. Con Premium, hasta ${PRACTICE_MAX.premium}.`,
            { resource: 'cryptoPractice', limit: max }
          );
        }
        throw new BusinessRuleError(
          'CRYPTO_PRACTICE_LIMIT',
          `Puedes tener hasta ${max} carteras de prácticas a la vez. Borra una para crear otra.`
        );
      }
      this.countPracticeAction(userId);
      const portfolio = this.newPortfolio(userId, 'practice', null, PRACTICE_INITIAL_CENTS);
      this.repo.insertPortfolio(portfolio);
      return portfolio.id;
    });
    return this.portfolio(userId, id);
  }

  /** «Start again» of a practice portfolio: 10.000 € again. The official season never restarts. */
  async resetPractice(userId: string, portfolioId?: string): Promise<CryptoSimView> {
    await this.ensureSeason(userId);
    const portfolio = portfolioId ? this.repo.portfolio(userId, portfolioId) : null;
    if (!portfolio || portfolio.kind !== 'practice') {
      throw new BusinessRuleError(
        'CRYPTO_SEASON_NO_RESET',
        'La temporada oficial no se reinicia: todos empiezan con 10.000 € el día 1. Para practicar, usa una cartera de prácticas.'
      );
    }
    this.uow.run(() => {
      this.countPracticeAction(userId);
      this.repo.clear(portfolio.id);
      this.repo.savePortfolio({
        ...portfolio,
        initialCents: PRACTICE_INITIAL_CENTS,
        cashCents: PRACTICE_INITIAL_CENTS,
        feeBps: DEFAULT_FEE_BPS,
        startedAt: this.clock.now().toISOString(),
      });
    });
    return this.portfolio(userId, portfolio.id);
  }

  /** Deletes a practice portfolio and its operations; answers with the official one. */
  async deletePractice(userId: string, portfolioId: string): Promise<CryptoSimView> {
    if (!this.uow.run(() => this.repo.deletePortfolio(userId, portfolioId))) {
      throw new NotFoundError(
        'Esa cartera de prácticas ya no existe',
        'CRYPTO_PORTFOLIO_NOT_FOUND'
      );
    }
    return this.portfolio(userId);
  }

  /**
   * The full report of a season (Premium; the route checks the plan): every operation closed,
   * the frozen result once it ended and the advanced statistics.
   */
  async report(userId: string, season?: string): Promise<CryptoSeasonReportView> {
    await this.ensureSeason(userId);
    const month = season ?? madridMonth(this.clock.now());
    const portfolio = this.repo.seasonPortfolio(userId, month);
    if (!portfolio) {
      throw new NotFoundError(
        'No hay operaciones guardadas de esa temporada',
        'CRYPTO_SEASON_NOT_FOUND'
      );
    }
    const tickers = portfolio.closedAt ? null : await this.tickers();
    const prices = tickers ? priceMap(tickers) : new Map<string, number>();
    const closed = this.repo.positions(portfolio.id).filter((p) => p.closedAt);
    const result = this.repo.results(userId, HISTORY_SEASONS).find((r) => r.season === month);
    return {
      season: month,
      finished: portfolio.closedAt !== null,
      initial: fromCents(portfolio.initialCents),
      result: result ? resultView(result) : null,
      closed: closed.map(closedView),
      stats: await this.stats(portfolio, closed, prices),
    };
  }

  // ─── Seasons ─────────────────────────────────────────────────────────────

  /**
   * Freezes the finished seasons of the person and makes sure the one of this month exists.
   * Idempotent: the hourly job and any look at the console can call it.
   */
  async ensureSeason(userId: string): Promise<CryptoSimPortfolio> {
    const month = madridMonth(this.clock.now());
    for (const p of this.repo.portfolios(userId)) {
      if (p.kind === 'season' && p.season! < month) await this.closeSeason(p);
    }
    return this.uow.run(() => {
      const current = this.repo.seasonPortfolio(userId, month);
      if (current) return current;
      const fresh = this.newPortfolio(userId, 'season', month, SEASON_INITIAL_CENTS);
      this.repo.insertPortfolio(fresh);
      return fresh;
    });
  }

  /** Every official portfolio of a finished season, frozen (the hourly job). */
  async closeFinishedSeasons(): Promise<number> {
    const month = madridMonth(this.clock.now());
    const prices = new Map<string, number | null>();
    let closed = 0;
    for (const p of this.repo.seasonPortfoliosBefore(month)) {
      try {
        if (await this.closeSeason(p, prices)) closed += 1;
      } catch (e) {
        this.logger.error('[crypto] could not close a season', e);
      }
    }
    return closed;
  }

  /** Saves today's equity of every official portfolio of this month (for the Premium chart). */
  async snapshotEquity(): Promise<number> {
    const tickers = await this.tickers();
    if (!tickers || tickers.stale) return 0;
    const prices = priceMap(tickers);
    const now = this.clock.now();
    const day = madridDay(now);
    let saved = 0;
    for (const p of this.repo.seasonPortfoliosOf(madridMonth(now))) {
      const equity = this.equityCents(p, prices);
      if (equity === null) continue;
      this.repo.saveEquityDay(p.id, day, equity);
      saved += 1;
    }
    return saved;
  }

  /**
   * Equity of a portfolio at `prices` (cash, reserved for pending orders and open positions at
   * the price they would be sold at); null when a coin has no price.
   */
  equityCents(p: CryptoSimPortfolio, prices: Prices): number | null {
    const reserved = this.repo.orders(p.id).reduce((sum, o) => sum + o.reservedCents, 0);
    let value = 0;
    for (const position of this.repo.positions(p.id)) {
      if (position.closedAt) continue;
      const price = prices.get(position.symbol);
      if (price === undefined) return null;
      value += sale(position, price, p.feeBps).proceedsCents;
    }
    return p.cashCents + reserved + value;
  }

  /** Closed operations of a portfolio: how many count for the ranking and since when. */
  activityOf(portfolioId: string): ReturnType<typeof activity> & { wins: number } {
    const positions = this.repo.positions(portfolioId);
    const counted = positions.filter((p) => p.closedAt && p.closeType !== 'season');
    return {
      ...activity(positions),
      wins: counted.filter((p) => p.pnlCents! > 0).length,
    };
  }

  /**
   * Freezes one official portfolio of a finished season: pending orders reached before the end
   * are filled, the rest are cancelled, open positions are closed at the last price of the month
   * and the result is kept. False when it has to wait for prices (or it was already frozen).
   */
  private async closeSeason(
    portfolio: CryptoSimPortfolio,
    cache = new Map<string, number | null>()
  ): Promise<boolean> {
    const end = seasonEndsAt(portfolio.season!).getTime();
    await this.resolve(portfolio, await this.tickers(), end);
    const open = this.repo.positions(portfolio.id).filter((p) => !p.closedAt);
    const prices = new Map<string, number>();
    const patient = this.clock.now().getTime() - end < CLOSE_PRICE_PATIENCE_MS;
    for (const symbol of new Set(open.map((p) => p.symbol))) {
      const price = await this.closePrice(symbol, end, cache);
      if (price === null && patient) return false;
      if (price !== null) prices.set(symbol, price);
    }
    const premium = this.plan.isPremium(portfolio.userId);
    return this.uow.run(() => {
      const current = this.repo.portfolio(portfolio.userId, portfolio.id);
      if (!current || current.closedAt) return false;
      const at = new Date(end - 1000).toISOString();
      for (const order of this.repo.orders(portfolio.id)) {
        if (this.repo.deleteOrder(portfolio.userId, order.id)) {
          this.refund(portfolio.id, portfolio.userId, order.reservedCents);
        }
      }
      for (const position of open) {
        // Without any price for a day the operation ends as it started (only the commissions).
        const price = prices.get(position.symbol) ?? position.entryPrice;
        this.close(this.fresh(current), position, price, 'season', at);
      }
      const final = this.fresh(current);
      const positions = this.repo.positions(portfolio.id);
      const now = this.clock.now().toISOString();
      this.repo.savePortfolio({ ...final, closedAt: now });
      if (!positions.length) return true;
      const done = this.activityOf(portfolio.id);
      // Everybody is in the ranking, with the alias they chose or the one given to them.
      const who = this.repo.rankingIdentity(portfolio.userId);
      this.repo.insertResult({
        userId: portfolio.userId,
        season: portfolio.season!,
        initialCents: final.initialCents,
        finalCents: final.cashCents,
        trades: done.trades,
        wins: done.wins,
        activeDays: done.activeDays,
        reachedAt: done.reachedAt,
        ranked: true,
        alias: rankingAlias(who.alias, who.name, portfolio.userId),
        premium,
        place: null,
        prizeDays: 0,
        createdAt: now,
      });
      if (final.cashCents > final.initialCents) {
        this.repo.addBadge(portfolio.userId, 'positiveMonth', now);
      }
      return true;
    });
  }

  /**
   * The price of a coin when a season ended: the close of the last hourly candle before the end
   * (the same for everybody), else the last price; null when there is neither.
   */
  private async closePrice(
    symbol: string,
    end: number,
    cache: Map<string, number | null>
  ): Promise<number | null> {
    const key = `${symbol}:${end}`;
    if (cache.has(key)) return cache.get(key)!;
    let price: number | null = null;
    if (isCryptoSymbol(symbol)) {
      try {
        const feed = await this.market.candles(symbol, '1h');
        const last = feed.data.filter((c) => c.time + INTERVAL_MS['1h'] <= end).at(-1);
        price = last?.close ?? null;
      } catch {
        price = null;
      }
    }
    if (price === null) {
      const tickers = await this.tickers();
      price = (tickers && priceMap(tickers).get(symbol)) ?? null;
    }
    if (price !== null) cache.set(key, price);
    return price;
  }

  // ─── Orders ──────────────────────────────────────────────────────────────

  private buy(
    portfolio: CryptoSimPortfolio,
    input: Extract<CryptoOrderInput, { action: 'buy' }>,
    current: number,
    at: string
  ): void {
    const counts = this.repo.countPositions(portfolio.id);
    if (counts.total >= MAX_POSITIONS) {
      throw new BusinessRuleError(
        'CRYPTO_HISTORY_FULL',
        portfolio.kind === 'season'
          ? `Has llegado a ${MAX_POSITIONS} operaciones este mes. La próxima temporada empieza el día 1.`
          : `Has llegado a ${MAX_POSITIONS} operaciones. Descarga el historial y empieza de nuevo la cartera de prácticas.`
      );
    }
    if (counts.open >= MAX_OPEN_POSITIONS) {
      throw new BusinessRuleError(
        'CRYPTO_TOO_MANY_OPEN',
        `Puedes tener hasta ${MAX_OPEN_POSITIONS} posiciones abiertas a la vez.`
      );
    }
    const fee = feeCents(input.amountCents, portfolio.feeBps);
    const total = input.amountCents + fee;
    if (total > portfolio.cashCents) {
      throw new BusinessRuleError(
        'CRYPTO_NO_BALANCE',
        portfolio.kind === 'season'
          ? 'No tienes saldo virtual suficiente para esta compra (con la comisión). Puedes seguir practicando con una cartera de prácticas.'
          : 'No tienes saldo virtual suficiente para esta compra (con la comisión).',
        { kind: portfolio.kind }
      );
    }
    const direction = input.direction ?? 'long';
    const entry = input.type === 'market' ? current : input.price!;
    const exits = this.exitPrices(input, direction, entry, current);
    if (input.type === 'market') {
      const position = openPosition(
        portfolio,
        input.symbol,
        direction,
        input.amountCents,
        fee,
        current,
        'market',
        at
      );
      this.repo.insertPosition(position);
      this.insertExits(position, exits, at);
    } else {
      const side = sideOf(direction, true);
      const price = this.pendingPrice(side, input.type, input.price!, current);
      this.checkPendingRoom(portfolio);
      this.repo.insertOrder({
        id: randomUUID(),
        userId: portfolio.userId,
        portfolioId: portfolio.id,
        symbol: input.symbol,
        side,
        direction,
        type: input.type,
        price,
        amountCents: input.amountCents,
        reservedCents: total,
        positionId: null,
        createdAt: at,
        takeProfit: input.takeProfit ?? null,
        stopLoss: input.stopLoss ?? null,
      });
    }
    this.repo.savePortfolio({ ...portfolio, cashCents: portfolio.cashCents - total });
  }

  private sell(
    portfolio: CryptoSimPortfolio,
    input: Extract<CryptoOrderInput, { action: 'sell' }>,
    prices: Prices,
    at: string
  ): void {
    const position = this.repo.position(portfolio.userId, input.positionId);
    if (!position || position.closedAt || position.portfolioId !== portfolio.id) {
      throw new NotFoundError('Esa posición ya no está abierta', 'CRYPTO_POSITION_NOT_FOUND');
    }
    const current = priceOf(prices, position.symbol);
    if (input.type === 'market') {
      this.close(portfolio, position, current, 'market', at);
      return;
    }
    const side = sideOf(position.direction, false);
    const price = this.pendingPrice(side, input.type, input.price!, current);
    const orders = this.repo.orders(portfolio.id);
    if (orders.some((o) => o.positionId === position.id && o.type === input.type)) {
      throw new BusinessRuleError(
        'CRYPTO_DUPLICATE_ORDER',
        'Esta posición ya tiene una orden de ese tipo. Cancélala antes de poner otra.'
      );
    }
    this.repo.insertOrder({
      id: randomUUID(),
      userId: portfolio.userId,
      portfolioId: portfolio.id,
      symbol: position.symbol,
      side,
      direction: position.direction,
      type: input.type,
      price,
      amountCents: null,
      reservedCents: 0,
      positionId: position.id,
      createdAt: at,
      takeProfit: null,
      stopLoss: null,
    });
  }

  /**
   * Take profit and stop loss of a new position. A long gains above its entry and loses below;
   * a short the other way round. A market position's exits must not be reached already.
   */
  private exitPrices(
    input: Extract<CryptoOrderInput, { action: 'buy' }>,
    direction: Direction,
    entry: number,
    current: number
  ): { type: PendingType; price: number }[] {
    const long = direction === 'long';
    const exits: { type: PendingType; price: number }[] = [];
    if (input.takeProfit !== undefined) {
      if (!(long ? input.takeProfit > entry : input.takeProfit < entry)) {
        throw new BusinessRuleError(
          'CRYPTO_TAKE_PROFIT_SIDE',
          long
            ? 'El precio objetivo (take profit) tiene que estar por encima del precio de entrada.'
            : 'En un corto, el precio objetivo (take profit) tiene que estar por debajo del de entrada.'
        );
      }
      exits.push({
        type: 'limit',
        price: this.exitPrice('limit', input, direction, input.takeProfit, current),
      });
    }
    if (input.stopLoss !== undefined) {
      if (!(long ? input.stopLoss < entry : input.stopLoss > entry)) {
        throw new BusinessRuleError(
          'CRYPTO_STOP_LOSS_SIDE',
          long
            ? 'El precio de protección (stop loss) tiene que estar por debajo del precio de entrada.'
            : 'En un corto, el precio de protección (stop loss) tiene que estar por encima del de entrada.'
        );
      }
      exits.push({
        type: 'stop',
        price: this.exitPrice('stop', input, direction, input.stopLoss, current),
      });
    }
    return exits;
  }

  /** A market position's exits must not be reached now; a pending one's apply once filled. */
  private exitPrice(
    type: PendingType,
    input: Extract<CryptoOrderInput, { action: 'buy' }>,
    direction: Direction,
    price: number,
    current: number
  ): number {
    if (input.type === 'market') {
      return this.pendingPrice(sideOf(direction, false), type, price, current);
    }
    this.checkRange(price, current);
    return price;
  }

  /** The sale orders that go with a purchase (its take profit and stop loss). */
  private insertExits(
    position: CryptoSimPosition,
    exits: { type: PendingType; price: number }[],
    at: string
  ): void {
    for (const exit of exits) {
      this.repo.insertOrder({
        id: randomUUID(),
        userId: position.userId,
        portfolioId: position.portfolioId,
        symbol: position.symbol,
        side: sideOf(position.direction, false),
        direction: position.direction,
        type: exit.type,
        price: exit.price,
        amountCents: null,
        reservedCents: 0,
        positionId: position.id,
        createdAt: at,
        takeProfit: null,
        stopLoss: null,
      });
    }
  }

  /** The take profit or stop loss of an open position must not be reached by the price now. */
  private checkExit(direction: Direction, type: PendingType, price: number, current: number): void {
    this.checkRange(price, current);
    if (!fillsNow(sideOf(direction, false), type, price, current)) return;
    const long = direction === 'long';
    throw type === 'limit'
      ? new BusinessRuleError(
          'CRYPTO_TAKE_PROFIT_SIDE',
          long
            ? 'En un long, el take profit tiene que estar por encima del precio actual.'
            : 'En un short, el take profit tiene que estar por debajo del precio actual.',
          { current }
        )
      : new BusinessRuleError(
          'CRYPTO_STOP_LOSS_SIDE',
          long
            ? 'En un long, el stop loss tiene que estar por debajo del precio actual.'
            : 'En un short, el stop loss tiene que estar por encima del precio actual.',
          { current }
        );
  }

  private pendingPrice(
    side: 'buy' | 'sell',
    type: PendingType,
    price: number,
    current: number
  ): number {
    this.checkRange(price, current);
    if (fillsNow(side, type, price, current)) {
      throw new BusinessRuleError(
        'CRYPTO_ORDER_WOULD_FILL',
        'Con el precio de ahora esa orden se ejecutaría al momento: usa una orden a mercado.',
        { current }
      );
    }
    return price;
  }

  private checkRange(price: number, current: number): void {
    if (price < current / 100 || price > current * 100) {
      throw new BusinessRuleError(
        'CRYPTO_PRICE_OUT_OF_RANGE',
        'Ese precio está demasiado lejos del precio actual.'
      );
    }
  }

  private pendingMax(userId: string): number {
    return this.plan.isPremium(userId) ? PENDING_MAX.premium : PENDING_MAX.free;
  }

  /** Orders waiting to open a position (take profit and stop loss do not count: they go with one). */
  private entryOrders(portfolioId: string): number {
    return this.repo.orders(portfolioId).filter((o) => o.positionId === null).length;
  }

  private checkPendingRoom(portfolio: CryptoSimPortfolio): void {
    const max = this.pendingMax(portfolio.userId);
    if (this.entryOrders(portfolio.id) + 1 > max) {
      throw new BusinessRuleError(
        'CRYPTO_TOO_MANY_PENDING',
        max < PENDING_MAX.premium
          ? `Puedes tener hasta ${max} órdenes pendientes a la vez (con Premium, hasta ${PENDING_MAX.premium}).`
          : `Puedes tener hasta ${max} órdenes pendientes a la vez.`,
        { limit: max }
      );
    }
  }

  private close(
    portfolio: CryptoSimPortfolio,
    position: CryptoSimPosition,
    price: number,
    type: CloseType | 'season',
    at: string
  ): void {
    const result = sale(position, price, portfolio.feeBps);
    const closed = this.repo.closePosition(portfolio.userId, position.id, {
      exitPrice: price,
      exitFeeCents: result.feeCents,
      proceedsCents: result.proceedsCents,
      pnlCents: result.pnlCents,
      closeType: type,
      closedAt: at,
    });
    if (!closed) return;
    this.repo.deleteOrdersOfPosition(portfolio.userId, position.id);
    this.repo.savePortfolio({
      ...portfolio,
      cashCents: portfolio.cashCents + result.proceedsCents,
    });
  }

  private refund(portfolioId: string, userId: string, cents: Cents): void {
    if (cents <= 0) return;
    const portfolio = this.repo.portfolio(userId, portfolioId)!;
    this.repo.savePortfolio({ ...portfolio, cashCents: portfolio.cashCents + cents });
  }

  // ─── Pending orders reached by the price ─────────────────────────────────

  private async tickers(): Promise<Tickers> {
    try {
      return await this.market.tickers();
    } catch {
      return null;
    }
  }

  /**
   * Fills the pending orders (and exhausted shorts) of a portfolio reached by the price. With
   * `until` (a season that ended) only the candles before it count and the last price does not.
   */
  private async resolve(
    portfolio: CryptoSimPortfolio,
    tickers: Tickers,
    until?: number
  ): Promise<CryptoFillView[]> {
    const orders = this.repo.orders(portfolio.id);
    const shorts = this.repo
      .positions(portfolio.id)
      .filter((p) => !p.closedAt && p.direction === 'short');
    if (!orders.length && !shorts.length) return [];
    const now = until ?? this.clock.now().getTime();
    const since = new Map<string, number>();
    const watch = (symbol: string, at: string): void => {
      since.set(symbol, Math.min(since.get(symbol) ?? Infinity, Date.parse(at)));
    };
    orders.forEach((o) => watch(o.symbol, o.createdAt));
    shorts.forEach((p) => watch(p.symbol, p.openedAt));
    const candles = new Map<string, MarketCandle[]>();
    for (const [symbol, from] of since) {
      if (!isCryptoSymbol(symbol)) continue;
      try {
        const interval = resolutionFor(from, this.clock.now().getTime(), CANDLES_PER_SERIES);
        const feed = await this.market.candles(symbol, interval);
        candles.set(
          symbol,
          until === undefined
            ? feed.data
            : feed.data.filter((c) => c.time + INTERVAL_MS[interval] <= until)
        );
      } catch {
        // Without candles the orders of this coin wait for the next look (or expire).
      }
    }
    const prices = tickers && until === undefined ? priceMap(tickers) : new Map<string, number>();
    const priceAt = tickers ? Date.parse(tickers.updatedAt) : now;
    return this.uow.run(() => this.apply(portfolio, orders, shorts, candles, prices, priceAt, now));
  }

  private apply(
    portfolio: CryptoSimPortfolio,
    orders: CryptoSimOrder[],
    shorts: CryptoSimPosition[],
    candles: Map<string, MarketCandle[]>,
    prices: Prices,
    priceAt: number,
    now: number
  ): CryptoFillView[] {
    const { userId } = portfolio;
    const events: CryptoFillView[] = [];
    // Only the orders that open a position expire; its take profit, stop loss and guarantee last.
    const fillOf = (o: PendingLike & { symbol: string }, lasting: boolean): Fill | null => {
      const series = candles.get(o.symbol);
      const price = prices.get(o.symbol);
      if (!series && price === undefined) return null;
      return findFill(
        o,
        series ?? [],
        price === undefined || stalePrice(priceAt, now) ? null : { price, at: priceAt },
        lasting ? Infinity : undefined
      );
    };
    const expired = (o: CryptoSimOrder): boolean =>
      o.positionId === null && now - Date.parse(o.createdAt) > PENDING_MS;

    type Exit = { order: CryptoSimOrder | null; fill: Fill; type: CloseType };
    const exits = new Map<string, Exit[]>();
    const addExit = (positionId: string, exit: Exit): void => {
      exits.set(positionId, [...(exits.get(positionId) ?? []), exit]);
    };

    for (const order of orders) {
      const fill = fillOf(order, order.positionId !== null);
      if (fill && order.positionId === null) {
        if (!this.repo.deleteOrder(userId, order.id)) continue;
        this.openFromOrder(portfolio, order, fill);
        events.push(event(order, order.type, fill.price, fill.at));
      } else if (fill) {
        addExit(order.positionId!, { order, fill, type: order.type });
      } else if (expired(order) && this.repo.deleteOrder(userId, order.id)) {
        this.refund(portfolio.id, userId, order.reservedCents);
        events.push(event(order, 'expired', null, new Date(now).toISOString()));
      }
    }
    // A short whose price doubled has used up its guarantee: it closes by itself.
    for (const position of shorts) {
      const fill = fillOf(
        {
          symbol: position.symbol,
          side: 'buy',
          type: 'stop',
          price: liquidationPrice(position.entryPrice),
          createdAt: position.openedAt,
        },
        true
      );
      if (fill) addExit(position.id, { order: null, fill, type: 'liquidation' });
    }
    for (const [positionId, list] of exits) {
      // Orders go with their position when it closes, so the position is still open here.
      const position = this.repo.position(userId, positionId)!;
      const winner = firstFill(list)!;
      this.close(this.fresh(portfolio), position, winner.fill.price, winner.type, winner.fill.at);
      events.push({
        orderId: winner.order?.id ?? position.id,
        symbol: position.symbol,
        side: sideOf(position.direction, false),
        direction: position.direction,
        type: winner.type as PendingType | 'liquidation',
        price: winner.fill.price,
        at: winner.fill.at,
      });
    }
    return events;
  }

  /** A pending order reached by the price opens its position, with its take profit and stop loss. */
  private openFromOrder(portfolio: CryptoSimPortfolio, order: CryptoSimOrder, fill: Fill): void {
    const fee = order.reservedCents - order.amountCents!;
    const position = openPosition(
      portfolio,
      order.symbol,
      order.direction,
      order.amountCents!,
      fee,
      fill.price,
      order.type,
      fill.at
    );
    this.repo.insertPosition(position);
    const exits: { type: PendingType; price: number }[] = [];
    if (order.takeProfit !== null) exits.push({ type: 'limit', price: order.takeProfit });
    if (order.stopLoss !== null) exits.push({ type: 'stop', price: order.stopLoss });
    this.insertExits(position, exits, fill.at);
  }

  // ─── Portfolios ──────────────────────────────────────────────────────────

  private newPortfolio(
    userId: string,
    kind: 'season' | 'practice',
    season: string | null,
    initialCents: Cents
  ): CryptoSimPortfolio {
    return {
      id: randomUUID(),
      userId,
      kind,
      season,
      initialCents,
      cashCents: initialCents,
      feeBps: DEFAULT_FEE_BPS,
      startedAt: this.clock.now().toISOString(),
      closedAt: null,
    };
  }

  /** The portfolio to show: the one asked for while in use, else the official one of the month. */
  private pick(userId: string, portfolioId?: string): CryptoSimPortfolio {
    const asked = portfolioId ? this.repo.portfolio(userId, portfolioId) : null;
    if (asked && !asked.closedAt) return asked;
    return this.repo.seasonPortfolio(userId, madridMonth(this.clock.now()))!;
  }

  /** The portfolio to operate on: it must be the person's and in use. */
  private writable(userId: string, portfolioId?: string): CryptoSimPortfolio {
    if (!portfolioId) return this.pick(userId);
    const portfolio = this.repo.portfolio(userId, portfolioId);
    if (!portfolio || portfolio.closedAt) {
      throw new NotFoundError(
        'Esa cartera ya no está en uso. Vuelve a abrir la consola.',
        'CRYPTO_PORTFOLIO_NOT_FOUND'
      );
    }
    return portfolio;
  }

  private fresh(portfolio: CryptoSimPortfolio): CryptoSimPortfolio {
    return this.repo.portfolio(portfolio.userId, portfolio.id)!;
  }

  private profile(userId: string): CryptoSimProfile {
    return (
      this.repo.profile(userId) ?? {
        userId,
        alias: null,
        practiceDay: null,
        practiceActions: 0,
        updatedAt: this.clock.now().toISOString(),
      }
    );
  }

  private practiceActionsLeft(userId: string): number {
    const profile = this.profile(userId);
    const today = madridDay(this.clock.now());
    const used = profile.practiceDay === today ? profile.practiceActions : 0;
    return Math.max(0, PRACTICE_ACTIONS_PER_DAY - used);
  }

  /** New and restarted practice portfolios count towards a daily limit. */
  private countPracticeAction(userId: string): void {
    if (this.practiceActionsLeft(userId) === 0) {
      throw new BusinessRuleError(
        'CRYPTO_PRACTICE_DAILY',
        `Puedes crear o reiniciar carteras de prácticas hasta ${PRACTICE_ACTIONS_PER_DAY} veces al día. Vuelve mañana.`
      );
    }
    const profile = this.profile(userId);
    const today = madridDay(this.clock.now());
    this.repo.saveProfile({
      ...profile,
      practiceDay: today,
      practiceActions: (profile.practiceDay === today ? profile.practiceActions : 0) + 1,
      updatedAt: this.clock.now().toISOString(),
    });
  }

  /** Light badges: first operation, first take profit and ten operations closed. */
  private awardBadges(userId: string): void {
    const facts = this.repo.badgeFacts(userId);
    const at = this.clock.now().toISOString();
    if (facts.opened > 0) this.repo.addBadge(userId, 'firstTrade', at);
    if (facts.takeProfit > 0) this.repo.addBadge(userId, 'firstTakeProfit', at);
    if (facts.closed >= 10) this.repo.addBadge(userId, 'tenTrades', at);
  }

  // ─── View ────────────────────────────────────────────────────────────────

  private async view(
    userId: string,
    portfolioId: string,
    tickers: Tickers,
    fills: CryptoFillView[]
  ): Promise<CryptoSimView> {
    const premium = this.plan.isPremium(userId);
    const now = this.clock.now();
    const month = madridMonth(now);
    const portfolio = this.uow.run(() => {
      this.awardBadges(userId);
      return this.repo.portfolio(userId, portfolioId)!;
    });
    const prices = tickers ? priceMap(tickers) : new Map<string, number>();
    const all = this.repo.positions(portfolio.id);
    const orders = this.repo.orders(portfolio.id);
    const reservedCents = orders.reduce((sum, o) => sum + o.reservedCents, 0);

    const open = all
      .filter((p) => !p.closedAt)
      .map((p) => {
        const current = prices.get(p.symbol) ?? null;
        const sold = current === null ? null : sale(p, current, portfolio.feeBps);
        return {
          id: p.id,
          symbol: p.symbol,
          direction: p.direction,
          quantity: p.quantity,
          entryPrice: p.entryPrice,
          liquidationPrice: p.direction === 'short' ? liquidationPrice(p.entryPrice) : null,
          invested: fromCents(p.amountCents),
          entryFee: fromCents(p.entryFeeCents),
          openType: p.openType,
          openedAt: p.openedAt,
          currentPrice: current,
          value: sold && fromCents(sold.proceedsCents),
          exitFee: sold && fromCents(sold.feeCents),
          pnl: sold && fromCents(sold.pnlCents),
          pnlPercent: sold && sold.pnlPercent,
          _cents: sold,
        };
      });
    const closedRows = all.filter((p) => p.closedAt);
    const closed = closedRows.map(closedView);
    const perf = performance(closedRows.map((p) => ({ pnlCents: p.pnlCents! })));
    const priced = open.every((p) => p._cents !== null);
    const openValue = open.reduce((sum, p) => sum + (p._cents?.proceedsCents ?? 0), 0);
    const unrealized = open.reduce((sum, p) => sum + (p._cents?.pnlCents ?? 0), 0);
    const equity = portfolio.cashCents + reservedCents + openValue;
    const total = equity - portfolio.initialCents;
    if (priced && tickers && !tickers.stale) {
      this.uow.run(() => this.repo.saveEquityDay(portfolio.id, madridDay(now), equity));
    }
    const left = daysLeft(month, now);

    return {
      portfolio: ref(portfolio),
      portfolios: this.repo.portfolios(userId).map(ref),
      account: {
        initial: fromCents(portfolio.initialCents),
        cash: fromCents(portfolio.cashCents),
        reserved: fromCents(reservedCents),
        feeBps: portfolio.feeBps,
        startedAt: portfolio.startedAt,
      },
      open: open.map(({ _cents, ...p }) => p),
      pending: orders.map((o) => ({
        id: o.id,
        symbol: o.symbol,
        side: o.side,
        direction: o.direction,
        type: o.type,
        price: o.price,
        amount: o.amountCents === null ? null : fromCents(o.amountCents),
        reserved: fromCents(o.reservedCents),
        positionId: o.positionId,
        takeProfit: o.takeProfit,
        stopLoss: o.stopLoss,
        createdAt: o.createdAt,
        expiresAt: new Date(Date.parse(o.createdAt) + PENDING_MS).toISOString(),
        currentPrice: prices.get(o.symbol) ?? null,
      })),
      closed,
      summary: {
        equity: priced ? fromCents(equity) : null,
        realized: fromCents(perf.realizedCents),
        unrealized: priced ? fromCents(unrealized) : null,
        total: priced ? fromCents(total) : null,
        totalPercent: priced ? Math.round((total / portfolio.initialCents) * 10_000) / 100 : null,
        trades: perf.trades,
        wins: perf.wins,
        losses: perf.losses,
        winRate: perf.winRate,
      },
      season: {
        month,
        startsAt: monthStartsAt(month).toISOString(),
        endsAt: seasonEndsAt(month).toISOString(),
        daysLeft: left,
        endingSoon: left < SEASON_WARNING_DAYS,
        history: this.repo.results(userId, HISTORY_SEASONS).map(resultView),
      },
      plan: {
        premium,
        practiceMax: premium ? PRACTICE_MAX.premium : PRACTICE_MAX.free,
        practiceActionsLeft: this.practiceActionsLeft(userId),
      },
      badges: this.repo
        .badges(userId)
        .map((b) => ({ id: b.badge as BadgeId, earnedAt: b.earnedAt })),
      stats: premium ? await this.stats(portfolio, closedRows, prices) : null,
      market: {
        available: tickers !== null,
        stale: tickers?.stale ?? false,
        updatedAt: tickers?.updatedAt ?? null,
        source: this.market.source,
      },
      fills,
      limits: {
        pending: this.pendingMax(userId),
        open: MAX_OPEN_POSITIONS,
        operations: MAX_POSITIONS,
        pendingDays: PENDING_DAYS,
      },
    };
  }

  /** Premium statistics of a portfolio (the season or a practice one). */
  private async stats(
    portfolio: CryptoSimPortfolio,
    closed: CryptoSimPosition[],
    prices: Prices
  ): Promise<CryptoStatsView> {
    const counted = closed.filter((p) => p.closeType !== 'season');
    const perf = performance(counted.map((p) => ({ pnlCents: p.pnlCents! })));
    const sorted = [...counted].sort((a, b) => b.pnlCents! - a.pnlCents!);
    const wins = counted.filter((p) => p.pnlCents! > 0);
    const losses = counted.filter((p) => p.pnlCents! < 0);
    const average = (list: CryptoSimPosition[]): number | null =>
      list.length
        ? fromCents(Math.round(list.reduce((s, p) => s + p.pnlCents!, 0) / list.length))
        : null;
    return {
      winRate: perf.winRate,
      wins: perf.wins,
      losses: perf.losses,
      best: sorted.length ? highlight(sorted[0]) : null,
      worst: sorted.length ? highlight(sorted[sorted.length - 1]) : null,
      averageWin: average(wins),
      averageLoss: average(losses),
      equityDays: this.repo
        .equityDays(portfolio.id)
        .map((d) => ({ day: d.day, equity: fromCents(d.equityCents) })),
      hold: await this.hold(portfolio, prices),
    };
  }

  /** Keeping the coin used most (Bitcoin with no operations) since the portfolio started. */
  private async hold(
    portfolio: CryptoSimPortfolio,
    prices: Prices
  ): Promise<CryptoStatsView['hold']> {
    const uses = new Map<string, number>();
    for (const p of this.repo.positions(portfolio.id)) {
      uses.set(p.symbol, (uses.get(p.symbol) ?? 0) + 1);
    }
    const symbol = [...uses].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'BTC';
    const price = prices.get(symbol);
    if (price === undefined || !isCryptoSymbol(symbol)) return null;
    const started = Date.parse(portfolio.startedAt);
    try {
      const feed = await this.market.candles(symbol, '1h');
      const start = feed.data.filter((c) => c.time <= started).at(-1);
      if (!start) return null;
      return {
        symbol,
        startPrice: start.open,
        price,
        percent: Math.round((price / start.open - 1) * 10_000) / 100,
      };
    } catch {
      return null;
    }
  }
}

/** A finished season as the person sees it in their history. */
export function resultView(r: CryptoSeasonResult): CryptoSeasonResultView {
  return {
    season: r.season,
    initial: fromCents(r.initialCents),
    final: fromCents(r.finalCents),
    percent: returnPercent(r.finalCents, r.initialCents),
    trades: r.trades,
    wins: r.wins,
    activeDays: r.activeDays,
    qualified: qualifies(r),
    ranked: r.ranked,
    place: r.place,
    prizeDays: r.prizeDays,
  };
}

export function closedView(p: CryptoSimPosition): CryptoClosedView {
  const paid = p.amountCents + p.entryFeeCents;
  return {
    id: p.id,
    symbol: p.symbol,
    direction: p.direction,
    quantity: p.quantity,
    entryPrice: p.entryPrice,
    exitPrice: p.exitPrice!,
    invested: fromCents(p.amountCents),
    fees: fromCents(p.entryFeeCents + p.exitFeeCents!),
    proceeds: fromCents(p.proceedsCents!),
    pnl: fromCents(p.pnlCents!),
    pnlPercent: Math.round((p.pnlCents! / paid) * 10_000) / 100,
    openType: p.openType,
    closeType: p.closeType!,
    openedAt: p.openedAt,
    closedAt: p.closedAt!,
  };
}

const ref = (p: CryptoSimPortfolio): CryptoPortfolioRef => ({
  id: p.id,
  kind: p.kind,
  season: p.season,
  startedAt: p.startedAt,
});

function highlight(p: CryptoSimPosition): CryptoTradeHighlight {
  const view = closedView(p);
  return {
    symbol: p.symbol,
    direction: p.direction,
    pnl: view.pnl,
    pnlPercent: view.pnlPercent,
    closedAt: view.closedAt,
  };
}

/** A last price older than this does not fill orders (only the candles do). */
const PRICE_FRESH_MS = 2 * 60 * 1000;
const stalePrice = (priceAt: number, now: number): boolean => now - priceAt > PRICE_FRESH_MS;

function priceOf(prices: Prices, symbol: string): number {
  const price = prices.get(symbol);
  if (price === undefined) {
    throw new UnavailableError(
      'No tenemos el precio de esa moneda ahora mismo. Inténtalo en unos minutos.',
      'CRYPTO_PRICES_STALE'
    );
  }
  return price;
}

export const priceMap = (tickers: MarketFeed<MarketTicker[]>): Prices =>
  new Map(tickers.data.map((t) => [t.symbol, t.price]));

function openPosition(
  portfolio: CryptoSimPortfolio,
  symbol: string,
  direction: Direction,
  amountCents: Cents,
  entryFeeCents: Cents,
  price: number,
  openType: OrderType,
  openedAt: string
): CryptoSimPosition {
  return {
    id: randomUUID(),
    userId: portfolio.userId,
    portfolioId: portfolio.id,
    symbol,
    direction,
    quantity: amountCents / 100 / price,
    entryPrice: price,
    amountCents,
    entryFeeCents,
    openType,
    openedAt,
    exitPrice: null,
    exitFeeCents: null,
    proceedsCents: null,
    pnlCents: null,
    closeType: null,
    closedAt: null,
  };
}

const event = (
  order: CryptoSimOrder,
  type: CryptoFillView['type'],
  price: number | null,
  at: string
): CryptoFillView => ({
  orderId: order.id,
  symbol: order.symbol,
  side: order.side,
  direction: order.direction,
  type,
  price,
  at,
});
