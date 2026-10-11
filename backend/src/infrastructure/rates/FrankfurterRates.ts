import { BusinessRuleError } from '@domain/errors';
import { ExchangeRates } from '@domain/ports/services';

const TTL_MS = 12 * 60 * 60 * 1000;
const TIMEOUT_MS = 5000;

/** Daily ECB reference rates through frankfurter.dev (free, no key); cached for half a day. */
export class FrankfurterRates implements ExchangeRates {
  private readonly cache = new Map<string, { rate: number; at: number }>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly http: typeof fetch = fetch,
    private readonly baseUrl = 'https://api.frankfurter.dev/v1'
  ) {}

  async rate(from: string, to: string): Promise<number> {
    if (from === to) return 1;
    const key = `${from}>${to}`;
    const hit = this.cache.get(key);
    if (hit && this.now() - hit.at < TTL_MS) return hit.rate;
    try {
      const res = await this.http(`${this.baseUrl}/latest?base=${from}&symbols=${to}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { rates?: Record<string, number> };
      const rate = body.rates?.[to];
      if (typeof rate !== 'number' || !(rate > 0)) throw new Error('rate missing');
      this.cache.set(key, { rate, at: this.now() });
      return rate;
    } catch {
      throw new BusinessRuleError(
        'RATES_UNAVAILABLE',
        'No hemos podido obtener el tipo de cambio. Escríbelo a mano.'
      );
    }
  }
}
