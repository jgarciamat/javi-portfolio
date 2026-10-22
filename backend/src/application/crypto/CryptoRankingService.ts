import { ValidationError } from '@domain/errors';
import {
  CryptoSeasonResult,
  CryptoSimRepository,
  SettingsRepository,
  UnitOfWork,
  UserRepository,
} from '@domain/ports/repositories';
import { Clock, CryptoMarketData } from '@domain/ports/services';
import {
  ALIAS_MAX,
  ALIAS_MIN,
  PRIZE_DAYS,
  RANKING_MIN_DAYS,
  RANKING_MIN_TRADES,
  RANKING_SIZE,
  SEASON_HISTORY_MONTHS,
  SEASON_INITIAL_CENTS,
  SeasonEntry,
  aliasProblem,
  cleanAlias,
  daysLeft,
  madridMonth,
  missing,
  monthsBefore,
  previousMonth,
  qualifies,
  rank,
  returnPercent,
  seasonEndsAt,
  suggestedAlias,
} from '@domain/services/crypto-season';
import { MarketFeed, MarketTicker } from '@domain/services/crypto-market';
import { fromCents } from '@domain/shared/money';
import { PushService } from '@application/push/PushService';
import { CryptoPlan, CryptoSimService, priceMap } from './CryptoSimService';

/** One place of the ranking: only the alias, never the e-mail, the name or an id. */
export interface CryptoRankingRow {
  place: number;
  alias: string;
  percent: number;
  trades: number;
  /** A small aesthetic badge next to the alias (it gives no advantage). */
  premium: boolean;
}

export interface CryptoRankingView {
  season: { month: string; endsAt: string; daysLeft: number };
  top: CryptoRankingRow[];
  /** People who meet the minimums this month (only the number). */
  participants: number;
  /** The person's own figures: only they see them. */
  me: {
    place: number | null;
    percent: number | null;
    trades: number;
    activeDays: number;
    qualified: boolean;
    missing: { trades: number; days: number };
  };
  settings: { optIn: boolean; alias: string | null; suggestedAlias: string | null };
  previous: { month: string; top: CryptoRankingRow[] } | null;
  rules: {
    size: number;
    minTrades: number;
    minDays: number;
    prizeDays: number;
    initial: number;
    aliasMin: number;
    aliasMax: number;
  };
}

/** Something the ranking needs of the plan: the prize is added to the person's Premium. */
export interface PrizeGranter {
  grantDays(userId: string, days: number, options?: { afterPaidPeriod?: boolean }): boolean;
}

interface LiveEntry extends SeasonEntry {
  userId: string;
  alias: string;
  premium: boolean;
}

const CACHE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const COPY = {
  es: {
    title: 'Has ganado 1 mes de Premium',
    body: (month: string) =>
      `Has quedado primero en el ranking de la consola crypto de ${month}. Ya tienes tu mes de Premium de regalo.`,
  },
  en: {
    title: 'You have won 1 month of Premium',
    body: (month: string) =>
      `You came first in the crypto console ranking of ${month}. Your free month of Premium is ready.`,
  },
} as const;

/**
 * The voluntary monthly ranking of the crypto console (top 5, play money): who appears (only
 * those who turned it on, with an alias), the live table of the month, the person's own place
 * and, on the 1st, the frozen top 5 and one month of Premium for the winner. Also the hourly job
 * that closes the seasons and the price alerts' clean-up.
 */
export class CryptoRankingService {
  private cache: { month: string; at: number; entries: LiveEntry[] } | null = null;

  constructor(
    private readonly repo: CryptoSimRepository,
    private readonly sim: CryptoSimService,
    private readonly market: CryptoMarketData,
    private readonly users: UserRepository,
    private readonly settings: SettingsRepository,
    private readonly plan: CryptoPlan,
    private readonly prizes: PrizeGranter,
    private readonly push: PushService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly logger: Pick<Console, 'error' | 'info'> = console
  ) {}

  async ranking(userId: string): Promise<CryptoRankingView> {
    const own = await this.sim.ensureSeason(userId);
    const now = this.clock.now();
    const month = madridMonth(now);
    const entries = await this.live(month);
    const profile = this.repo.profile(userId);
    const optIn = !!profile?.rankingOptIn;
    const place = entries.findIndex((e) => e.userId === userId);
    const counted = this.sim.activityOf(own.id);
    const tickers = await this.tickers();
    const equity = tickers ? this.sim.equityCents(own, priceMap(tickers)) : null;
    const previous = previousMonth(month);
    const frozen = this.repo
      .seasonResults(previous)
      .filter((r) => r.place !== null)
      .sort((a, b) => a.place! - b.place!);
    return {
      season: { month, endsAt: seasonEndsAt(month).toISOString(), daysLeft: daysLeft(month, now) },
      top: entries.slice(0, RANKING_SIZE).map(row),
      participants: entries.length,
      me: {
        place: optIn && place >= 0 ? place + 1 : null,
        percent: equity === null ? null : returnPercent(equity, own.initialCents),
        trades: counted.trades,
        activeDays: counted.activeDays,
        qualified: qualifies(counted),
        missing: missing(counted),
      },
      settings: {
        optIn,
        alias: profile?.alias ?? null,
        suggestedAlias: suggestedAlias(this.users.findById(userId)?.name ?? ''),
      },
      previous: frozen.length ? { month: previous, top: frozen.map(frozenRow) } : null,
      rules: {
        size: RANKING_SIZE,
        minTrades: RANKING_MIN_TRADES,
        minDays: RANKING_MIN_DAYS,
        prizeDays: PRIZE_DAYS,
        initial: fromCents(SEASON_INITIAL_CENTS),
        aliasMin: ALIAS_MIN,
        aliasMax: ALIAS_MAX,
      },
    };
  }

  /** Turns the ranking on or off and changes the alias (checked: no e-mails, links or insults). */
  async setSettings(
    userId: string,
    input: { optIn: boolean; alias?: string }
  ): Promise<CryptoRankingView> {
    const profile = this.repo.profile(userId);
    const typed = input.alias === undefined ? undefined : cleanAlias(input.alias);
    const alias =
      typed ??
      profile?.alias ??
      (input.optIn ? suggestedAlias(this.users.findById(userId)?.name ?? '') : null);
    if (typed !== undefined || input.optIn) {
      const problem = alias === null ? 'length' : aliasProblem(alias);
      if (problem) {
        throw new ValidationError(ALIAS_MESSAGES[problem], 'CRYPTO_ALIAS_INVALID', { problem });
      }
    }
    this.uow.run(() =>
      this.repo.saveProfile({
        userId,
        practiceDay: profile?.practiceDay ?? null,
        practiceActions: profile?.practiceActions ?? 0,
        rankingOptIn: input.optIn,
        alias,
        updatedAt: this.clock.now().toISOString(),
      })
    );
    this.cache = null;
    return this.ranking(userId);
  }

  // ─── The hourly job ──────────────────────────────────────────────────────

  /**
   * Closes finished seasons, freezes their top 5 and gives the prize (once per month), keeps
   * today's equity and deletes old history. Safe to run any number of times.
   */
  async run(): Promise<{ closed: number; rankings: number }> {
    const closed = await this.sim.closeFinishedSeasons();
    const rankings = await this.closeRankings();
    await this.sim.snapshotEquity();
    const month = madridMonth(this.clock.now());
    this.uow.run(() => {
      this.repo.purgeSeasonsBefore(monthsBefore(month, SEASON_HISTORY_MONTHS));
      this.repo.purgeAlerts(new Date(this.clock.now().getTime() - 30 * DAY_MS).toISOString());
    });
    if (closed || rankings) this.cache = null;
    return { closed, rankings };
  }

  /** The top 5 of every finished season whose results are all frozen; the winner gets Premium. */
  async closeRankings(): Promise<number> {
    const month = madridMonth(this.clock.now());
    let done = 0;
    for (const season of this.repo.seasonsToClose(month)) {
      const winner = this.uow.run(() => {
        if (!this.repo.claimSeasonClose(season, this.clock.now().toISOString())) return null;
        const entries = this.repo
          .seasonResults(season)
          .filter((r) => r.ranked && r.alias)
          .map(frozenEntry);
        const top = rank(entries).slice(0, RANKING_SIZE);
        top.forEach((e, i) => {
          const prize =
            i === 0 && this.prizes.grantDays(e.key, PRIZE_DAYS, { afterPaidPeriod: true });
          this.repo.setPlace(e.key, season, i + 1, prize ? PRIZE_DAYS : 0);
        });
        return top[0]?.key ?? null;
      });
      done += 1;
      if (winner) await this.notifyWinner(winner, season);
    }
    return done;
  }

  private async notifyWinner(userId: string, season: string): Promise<void> {
    if (!this.push.enabled) return;
    const locale = this.locale(userId);
    const label = new Date(`${season}-15T12:00:00Z`).toLocaleDateString(
      locale === 'es' ? 'es-ES' : 'en-GB',
      { month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }
    );
    try {
      await this.push.notify(userId, {
        title: COPY[locale].title,
        body: COPY[locale].body(label),
        url: '/?tab=crypto',
      });
    } catch (e) {
      this.logger.error('[crypto] could not tell the winner', e);
    }
  }

  private locale(userId: string): 'es' | 'en' {
    try {
      return this.settings.get(userId).locale === 'en' ? 'en' : 'es';
    } catch {
      return 'es';
    }
  }

  // ─── Live table ──────────────────────────────────────────────────────────

  private async tickers(): Promise<MarketFeed<MarketTicker[]> | null> {
    try {
      return await this.market.tickers();
    } catch {
      return null;
    }
  }

  /** Everybody who asked to appear and meets the minimums, in order (cached one minute). */
  private async live(month: string): Promise<LiveEntry[]> {
    const now = this.clock.now().getTime();
    if (this.cache && this.cache.month === month && now - this.cache.at < CACHE_MS) {
      return this.cache.entries;
    }
    const tickers = await this.tickers();
    const prices = tickers ? priceMap(tickers) : new Map<string, number>();
    const entries: LiveEntry[] = [];
    for (const { portfolio, alias } of this.repo.rankingCandidates(month)) {
      if (!alias) continue;
      const equity = this.sim.equityCents(portfolio, prices);
      if (equity === null) continue;
      const counted = this.sim.activityOf(portfolio.id);
      entries.push({
        key: portfolio.id,
        userId: portfolio.userId,
        alias,
        premium: this.plan.isPremium(portfolio.userId),
        finalCents: equity,
        initialCents: portfolio.initialCents,
        trades: counted.trades,
        activeDays: counted.activeDays,
        reachedAt: counted.reachedAt,
      });
    }
    const ranked = rank(entries);
    this.cache = { month, at: now, entries: ranked };
    return ranked;
  }
}

const ALIAS_MESSAGES = {
  length: `El alias tiene que tener entre ${ALIAS_MIN} y ${ALIAS_MAX} caracteres.`,
  characters:
    'El alias solo puede llevar letras, números, espacios, puntos, guiones y guiones bajos.',
  contact: 'El alias no puede llevar correos, enlaces ni números de teléfono.',
  words: 'Ese alias no está permitido. Prueba con otro.',
} as const;

const row = (e: LiveEntry, i: number): CryptoRankingRow => ({
  place: i + 1,
  alias: e.alias,
  percent: returnPercent(e.finalCents, e.initialCents),
  trades: e.trades,
  premium: e.premium,
});

const frozenRow = (r: CryptoSeasonResult): CryptoRankingRow => ({
  place: r.place!,
  alias: r.alias!,
  percent: returnPercent(r.finalCents, r.initialCents),
  trades: r.trades,
  premium: r.premium,
});

/** A frozen result as a ranking entry; its key is the user (never sent out). */
const frozenEntry = (r: CryptoSeasonResult): SeasonEntry => ({
  key: r.userId,
  finalCents: r.finalCents,
  initialCents: r.initialCents,
  trades: r.trades,
  activeDays: r.activeDays,
  reachedAt: r.reachedAt,
});
