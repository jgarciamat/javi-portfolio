import { UnavailableError } from '@domain/errors';
import { MarketFeed } from '@domain/services/crypto-market';

/** How long an older copy may stand in while the source is down. */
export const STALE_FOR_MS = 6 * 60 * 60 * 1000;

interface Entry<T> {
  data: T;
  at: number;
}

/**
 * Cache in front of a market source: a fresh copy is reused for `ttl`, concurrent misses share
 * one request (so a hundred open screens make one call), and when the source fails a copy up
 * to six hours old is returned marked `stale`. The keys come from a closed list (coins ×
 * sizes), so the cache cannot grow without bound.
 */
export class MarketCache {
  private readonly entries = new Map<string, Entry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly source: 'binance' | 'demo',
    private readonly now: () => number = Date.now,
    private readonly onError: (key: string, error: unknown) => void = () => undefined
  ) {}

  async get<T>(key: string, ttl: number, load: () => Promise<T>): Promise<MarketFeed<T>> {
    const hit = this.entries.get(key) as Entry<T> | undefined;
    if (hit && this.now() - hit.at < ttl) return this.feed(hit, false);
    try {
      return this.feed(await this.fetch(key, load), false);
    } catch (error) {
      this.onError(key, error);
      if (hit && this.now() - hit.at < STALE_FOR_MS) return this.feed(hit, true);
      throw new UnavailableError(
        'Los datos de mercado no están disponibles ahora. Inténtalo en unos minutos.',
        'MARKET_UNAVAILABLE'
      );
    }
  }

  private fetch<T>(key: string, load: () => Promise<T>): Promise<Entry<T>> {
    const running = this.inFlight.get(key) as Promise<Entry<T>> | undefined;
    if (running) return running;
    const request = load()
      .then((data) => {
        const entry = { data, at: this.now() };
        this.entries.set(key, entry);
        return entry;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, request);
    return request;
  }

  private feed<T>(entry: Entry<T>, stale: boolean): MarketFeed<T> {
    return {
      data: entry.data,
      source: this.source,
      updatedAt: new Date(entry.at).toISOString(),
      stale,
    };
  }
}
