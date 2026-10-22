import { randomUUID } from 'crypto';
import { BusinessRuleError, NotFoundError, UnavailableError } from '@domain/errors';
import {
  CryptoSimAccount,
  CryptoSimOrder,
  CryptoSimPosition,
  CryptoSimRepository,
  UnitOfWork,
} from '@domain/ports/repositories';
import { Clock, CryptoMarketData } from '@domain/ports/services';
import {
  CANDLES_PER_SERIES,
  CryptoSymbol,
  MarketCandle,
  MarketFeed,
  MarketTicker,
  isCryptoSymbol,
} from '@domain/services/crypto-market';
import {
  DEFAULT_FEE_BPS,
  DEFAULT_INITIAL_CENTS,
  Fill,
  MAX_OPEN_POSITIONS,
  MAX_PENDING_ORDERS,
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
import { Cents, fromCents } from '@domain/shared/money';

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
  closeType: TradeType | 'liquidation';
  openedAt: string;
  closedAt: string;
}

export interface CryptoSimView {
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

type Prices = Map<string, number>;
type Tickers = MarketFeed<MarketTicker[]> | null;

/**
 * The crypto simulator: a virtual balance per user, manual purchases and sales at market
 * price, and pending orders (limit and stop) that are filled when the price reaches them.
 * Pending orders are resolved whenever the portfolio is read, with the candles since they were
 * placed (finest size that reaches back) and the last price, so no background job is needed and
 * the same candles always give the same result. Play money only: nothing leaves the server.
 */
export class CryptoSimService {
  constructor(
    private readonly repo: CryptoSimRepository,
    private readonly market: CryptoMarketData,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock
  ) {}

  async portfolio(userId: string): Promise<CryptoSimView> {
    const tickers = await this.tickers();
    const fills = await this.resolve(userId, tickers);
    return this.view(userId, tickers, fills);
  }

  async place(userId: string, input: CryptoOrderInput): Promise<CryptoSimView> {
    const tickers = await this.tickers();
    const fills = await this.resolve(userId, tickers);
    if (!tickers || tickers.stale) {
      throw new UnavailableError(
        'Los precios no están al día ahora mismo. Inténtalo en unos minutos.',
        'CRYPTO_PRICES_STALE'
      );
    }
    const prices = priceMap(tickers);
    const at = this.clock.now().toISOString();
    this.uow.run(() => {
      const account = this.account(userId);
      if (input.action === 'buy') this.buy(account, input, priceOf(prices, input.symbol), at);
      else this.sell(account, input, prices, at);
    });
    return this.view(userId, tickers, fills);
  }

  async cancel(userId: string, orderId: string): Promise<CryptoSimView> {
    this.uow.run(() => {
      const order = this.repo.orders(userId).find((o) => o.id === orderId);
      if (!order || !this.repo.deleteOrder(userId, orderId)) {
        throw new NotFoundError('Esa orden ya no está pendiente', 'CRYPTO_ORDER_NOT_FOUND');
      }
      this.refund(userId, order.reservedCents);
    });
    return this.portfolio(userId);
  }

  /** «Start again»: a new virtual balance, with no positions or orders. */
  async reset(userId: string, initialCents: Cents, feeBps: number): Promise<CryptoSimView> {
    this.uow.run(() => {
      this.repo.clear(userId);
      this.repo.saveAccount({
        userId,
        initialCents,
        cashCents: initialCents,
        feeBps,
        startedAt: this.clock.now().toISOString(),
      });
    });
    return this.portfolio(userId);
  }

  /** The commission of the next purchases and sales (the past ones keep theirs). */
  async setFee(userId: string, feeBps: number): Promise<CryptoSimView> {
    this.uow.run(() => this.repo.saveAccount({ ...this.account(userId), feeBps }));
    return this.portfolio(userId);
  }

  // ─── Orders ──────────────────────────────────────────────────────────────

  private buy(
    account: CryptoSimAccount,
    input: Extract<CryptoOrderInput, { action: 'buy' }>,
    current: number,
    at: string
  ): void {
    const { userId } = account;
    const counts = this.repo.countPositions(userId);
    if (counts.total >= MAX_POSITIONS) {
      throw new BusinessRuleError(
        'CRYPTO_HISTORY_FULL',
        `Has llegado a ${MAX_POSITIONS} operaciones. Descarga el historial y pulsa «Empezar de nuevo».`
      );
    }
    if (counts.open >= MAX_OPEN_POSITIONS) {
      throw new BusinessRuleError(
        'CRYPTO_TOO_MANY_OPEN',
        `Puedes tener hasta ${MAX_OPEN_POSITIONS} posiciones abiertas a la vez.`
      );
    }
    const fee = feeCents(input.amountCents, account.feeBps);
    const total = input.amountCents + fee;
    if (total > account.cashCents) {
      throw new BusinessRuleError(
        'CRYPTO_NO_BALANCE',
        'No tienes saldo ficticio suficiente para esta compra (con la comisión).'
      );
    }
    const direction = input.direction ?? 'long';
    const entry = input.type === 'market' ? current : input.price!;
    const exits = this.exitPrices(input, direction, entry, current);
    if (input.type === 'market') {
      this.checkPendingRoom(userId, this.repo.orders(userId).length, exits.length);
      const position = openPosition(
        userId,
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
      this.checkPendingRoom(userId);
      this.repo.insertOrder({
        id: randomUUID(),
        userId,
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
    this.repo.saveAccount({ ...account, cashCents: account.cashCents - total });
  }

  private sell(
    account: CryptoSimAccount,
    input: Extract<CryptoOrderInput, { action: 'sell' }>,
    prices: Prices,
    at: string
  ): void {
    const { userId } = account;
    const position = this.repo.position(userId, input.positionId);
    if (!position || position.closedAt) {
      throw new NotFoundError('Esa posición ya no está abierta', 'CRYPTO_POSITION_NOT_FOUND');
    }
    const current = priceOf(prices, position.symbol);
    if (input.type === 'market') {
      this.close(account, position, current, 'market', at);
      return;
    }
    const side = sideOf(position.direction, false);
    const price = this.pendingPrice(side, input.type, input.price!, current);
    const orders = this.repo.orders(userId);
    if (orders.some((o) => o.positionId === position.id && o.type === input.type)) {
      throw new BusinessRuleError(
        'CRYPTO_DUPLICATE_ORDER',
        'Esta posición ya tiene una orden de ese tipo. Cancélala antes de poner otra.'
      );
    }
    this.checkPendingRoom(userId, orders.length);
    this.repo.insertOrder({
      id: randomUUID(),
      userId,
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

  private checkPendingRoom(
    userId: string,
    count = this.repo.orders(userId).length,
    adding = 1
  ): void {
    if (adding > 0 && count + adding > MAX_PENDING_ORDERS) {
      throw new BusinessRuleError(
        'CRYPTO_TOO_MANY_PENDING',
        `Puedes tener hasta ${MAX_PENDING_ORDERS} órdenes pendientes a la vez.`
      );
    }
  }

  private close(
    account: CryptoSimAccount,
    position: CryptoSimPosition,
    price: number,
    type: CloseType,
    at: string
  ): void {
    const result = sale(position, price, account.feeBps);
    const closed = this.repo.closePosition(account.userId, position.id, {
      exitPrice: price,
      exitFeeCents: result.feeCents,
      proceedsCents: result.proceedsCents,
      pnlCents: result.pnlCents,
      closeType: type,
      closedAt: at,
    });
    if (!closed) return;
    this.repo.deleteOrdersOfPosition(account.userId, position.id);
    this.repo.saveAccount({ ...account, cashCents: account.cashCents + result.proceedsCents });
  }

  private refund(userId: string, cents: Cents): void {
    if (cents <= 0) return;
    const account = this.account(userId);
    this.repo.saveAccount({ ...account, cashCents: account.cashCents + cents });
  }

  // ─── Pending orders reached by the price ─────────────────────────────────

  private async tickers(): Promise<Tickers> {
    try {
      return await this.market.tickers();
    } catch {
      return null;
    }
  }

  private async resolve(userId: string, tickers: Tickers): Promise<CryptoFillView[]> {
    const orders = this.repo.orders(userId);
    const shorts = this.repo
      .positions(userId)
      .filter((p) => !p.closedAt && p.direction === 'short');
    if (!orders.length && !shorts.length) return [];
    const now = this.clock.now().getTime();
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
        const feed = await this.market.candles(
          symbol,
          resolutionFor(from, now, CANDLES_PER_SERIES)
        );
        candles.set(symbol, feed.data);
      } catch {
        // Without candles the orders of this coin wait for the next look (or expire).
      }
    }
    const prices = tickers ? priceMap(tickers) : new Map<string, number>();
    const priceAt = tickers ? Date.parse(tickers.updatedAt) : now;
    return this.uow.run(() => this.apply(userId, orders, shorts, candles, prices, priceAt, now));
  }

  private apply(
    userId: string,
    orders: CryptoSimOrder[],
    shorts: CryptoSimPosition[],
    candles: Map<string, MarketCandle[]>,
    prices: Prices,
    priceAt: number,
    now: number
  ): CryptoFillView[] {
    const events: CryptoFillView[] = [];
    const fillOf = (o: PendingLike & { symbol: string }): Fill | null => {
      const series = candles.get(o.symbol);
      const price = prices.get(o.symbol);
      if (!series && price === undefined) return null;
      return findFill(
        o,
        series ?? [],
        price === undefined || stalePrice(priceAt, now) ? null : { price, at: priceAt }
      );
    };
    const expired = (o: CryptoSimOrder): boolean => now - Date.parse(o.createdAt) > PENDING_MS;

    type Exit = { order: CryptoSimOrder | null; fill: Fill; type: CloseType };
    const exits = new Map<string, Exit[]>();
    const addExit = (positionId: string, exit: Exit): void => {
      exits.set(positionId, [...(exits.get(positionId) ?? []), exit]);
    };

    for (const order of orders) {
      const fill = fillOf(order);
      if (fill && order.positionId === null) {
        if (!this.repo.deleteOrder(userId, order.id)) continue;
        this.openFromOrder(userId, order, fill);
        events.push(event(order, order.type, fill.price, fill.at));
      } else if (fill) {
        addExit(order.positionId!, { order, fill, type: order.type });
      } else if (expired(order) && this.repo.deleteOrder(userId, order.id)) {
        this.refund(userId, order.reservedCents);
        events.push(event(order, 'expired', null, new Date(now).toISOString()));
      }
    }
    // A short whose price doubled has used up its guarantee: it closes by itself.
    for (const position of shorts) {
      const fill = fillOf({
        symbol: position.symbol,
        side: 'buy',
        type: 'stop',
        price: liquidationPrice(position.entryPrice),
        createdAt: position.openedAt,
      });
      if (fill) addExit(position.id, { order: null, fill, type: 'liquidation' });
    }
    for (const [positionId, list] of exits) {
      // Orders go with their position when it closes, so the position is still open here.
      const position = this.repo.position(userId, positionId)!;
      const winner = firstFill(list)!;
      this.close(this.account(userId), position, winner.fill.price, winner.type, winner.fill.at);
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
  private openFromOrder(userId: string, order: CryptoSimOrder, fill: Fill): void {
    const fee = order.reservedCents - order.amountCents!;
    const position = openPosition(
      userId,
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

  // ─── View ────────────────────────────────────────────────────────────────

  private account(userId: string): CryptoSimAccount {
    const saved = this.repo.account(userId);
    if (saved) return saved;
    const fresh: CryptoSimAccount = {
      userId,
      initialCents: DEFAULT_INITIAL_CENTS,
      cashCents: DEFAULT_INITIAL_CENTS,
      feeBps: DEFAULT_FEE_BPS,
      startedAt: this.clock.now().toISOString(),
    };
    this.repo.saveAccount(fresh);
    return fresh;
  }

  private view(userId: string, tickers: Tickers, fills: CryptoFillView[]): CryptoSimView {
    const account = this.uow.run(() => this.account(userId));
    const prices = tickers ? priceMap(tickers) : new Map<string, number>();
    const all = this.repo.positions(userId);
    const orders = this.repo.orders(userId);
    const reservedCents = orders.reduce((sum, o) => sum + o.reservedCents, 0);

    const open = all
      .filter((p) => !p.closedAt)
      .map((p) => {
        const current = prices.get(p.symbol) ?? null;
        const now = current === null ? null : sale(p, current, account.feeBps);
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
          value: now && fromCents(now.proceedsCents),
          exitFee: now && fromCents(now.feeCents),
          pnl: now && fromCents(now.pnlCents),
          pnlPercent: now && now.pnlPercent,
          _cents: now,
        };
      });
    const closedRows = all.filter((p) => p.closedAt);
    const closed = closedRows.map((p) => {
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
    });
    const perf = performance(closedRows.map((p) => ({ pnlCents: p.pnlCents! })));
    const priced = open.every((p) => p._cents !== null);
    const openValue = open.reduce((sum, p) => sum + (p._cents?.proceedsCents ?? 0), 0);
    const unrealized = open.reduce((sum, p) => sum + (p._cents?.pnlCents ?? 0), 0);
    const equity = account.cashCents + reservedCents + openValue;
    const total = equity - account.initialCents;

    return {
      account: {
        initial: fromCents(account.initialCents),
        cash: fromCents(account.cashCents),
        reserved: fromCents(reservedCents),
        feeBps: account.feeBps,
        startedAt: account.startedAt,
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
        totalPercent: priced ? Math.round((total / account.initialCents) * 10_000) / 100 : null,
        trades: perf.trades,
        wins: perf.wins,
        losses: perf.losses,
        winRate: perf.winRate,
      },
      market: {
        available: tickers !== null,
        stale: tickers?.stale ?? false,
        updatedAt: tickers?.updatedAt ?? null,
        source: this.market.source,
      },
      fills,
      limits: {
        pending: MAX_PENDING_ORDERS,
        open: MAX_OPEN_POSITIONS,
        operations: MAX_POSITIONS,
        pendingDays: PENDING_DAYS,
      },
    };
  }
}

/** Calendar month in Spain (YYYY-MM): monthly periods of the console start on the 1st there. */
export function spanishMonth(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const part = (type: string): string => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}`;
}

/** First day of the month after `month` (YYYY-MM-DD). */
export function nextMonthStart(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, '0')}-01`;
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

const priceMap = (tickers: MarketFeed<MarketTicker[]>): Prices =>
  new Map(tickers.data.map((t) => [t.symbol, t.price]));

function openPosition(
  userId: string,
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
    userId,
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
