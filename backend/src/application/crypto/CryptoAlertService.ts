import { randomUUID } from 'crypto';
import { BusinessRuleError, NotFoundError } from '@domain/errors';
import {
  CryptoPriceAlert,
  CryptoSimRepository,
  SettingsRepository,
  UnitOfWork,
} from '@domain/ports/repositories';
import { Clock, CryptoMarketData, PushPayload } from '@domain/ports/services';
import { CRYPTO_COINS, CryptoSymbol } from '@domain/services/crypto-market';
import { ALERTS_MAX } from '@domain/services/crypto-season';
import { PushService } from '@application/push/PushService';
import { priceMap } from './CryptoSimService';

export interface CryptoAlertView {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  price: number;
  createdAt: string;
  /** When the notification went out (then it is not checked again). */
  triggeredAt: string | null;
}

export interface CryptoAlertsView {
  alerts: CryptoAlertView[];
  max: number;
  /** Whether this server can send notifications at all. */
  pushEnabled: boolean;
}

/** Premium only: the access check is the caller's (the route), like other Premium features. */
export interface PremiumCheck {
  assertFeature(userId: string, feature: 'cryptoPro'): void;
  isPremium(userId: string): boolean;
}

const COPY = {
  es: {
    title: 'Aviso de precio que pediste',
    above: (coin: string, price: string) => `${coin} ha llegado a ${price} o más.`,
    below: (coin: string, price: string) => `${coin} ha bajado a ${price} o menos.`,
    note: 'Es solo un aviso, no una recomendación.',
  },
  en: {
    title: 'The price alert you asked for',
    above: (coin: string, price: string) => `${coin} has reached ${price} or more.`,
    below: (coin: string, price: string) => `${coin} has fallen to ${price} or less.`,
    note: 'Only a notice, not a recommendation.',
  },
} as const;

/**
 * Price alerts of the crypto console (Premium): the person asks to be told once when a coin goes
 * above or below a price, and a service notification goes out. Neutral wording, no advice.
 */
export class CryptoAlertService {
  constructor(
    private readonly repo: CryptoSimRepository,
    private readonly market: CryptoMarketData,
    private readonly plan: PremiumCheck,
    private readonly push: PushService,
    private readonly settings: SettingsRepository,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly logger: Pick<Console, 'error'> = console
  ) {}

  list(userId: string): CryptoAlertsView {
    this.plan.assertFeature(userId, 'cryptoPro');
    return this.view(userId);
  }

  create(
    userId: string,
    input: { symbol: CryptoSymbol; condition: 'above' | 'below'; price: number }
  ): CryptoAlertsView {
    this.plan.assertFeature(userId, 'cryptoPro');
    this.uow.run(() => {
      const waiting = this.repo.alerts(userId).filter((a) => !a.triggeredAt).length;
      if (waiting >= ALERTS_MAX) {
        throw new BusinessRuleError(
          'CRYPTO_TOO_MANY_ALERTS',
          `Puedes tener hasta ${ALERTS_MAX} avisos de precio a la vez. Borra uno para crear otro.`
        );
      }
      this.repo.insertAlert({
        id: randomUUID(),
        userId,
        ...input,
        createdAt: this.clock.now().toISOString(),
        triggeredAt: null,
      });
    });
    return this.view(userId);
  }

  remove(userId: string, id: string): CryptoAlertsView {
    if (!this.uow.run(() => this.repo.deleteAlert(userId, id))) {
      throw new NotFoundError('Ese aviso ya no existe', 'CRYPTO_ALERT_NOT_FOUND');
    }
    return this.view(userId);
  }

  /** Every few minutes: alerts reached by the last price go out once (to Premium users). */
  async run(): Promise<number> {
    if (!this.push.enabled) return 0;
    let tickers;
    try {
      tickers = await this.market.tickers();
    } catch {
      return 0;
    }
    if (tickers.stale) return 0;
    const prices = priceMap(tickers);
    let sent = 0;
    for (const alert of this.repo.waitingAlerts()) {
      const price = prices.get(alert.symbol);
      if (price === undefined || !reached(alert, price)) continue;
      if (!this.plan.isPremium(alert.userId)) continue;
      if (!this.repo.triggerAlert(alert.id, this.clock.now().toISOString())) continue;
      try {
        if ((await this.push.notify(alert.userId, this.payload(alert))) > 0) sent += 1;
      } catch (e) {
        this.logger.error('[crypto] could not send a price alert', e);
      }
    }
    return sent;
  }

  private payload(alert: CryptoPriceAlert): PushPayload {
    const locale = this.settings.get(alert.userId).locale === 'en' ? 'en' : 'es';
    const copy = COPY[locale];
    const coin = CRYPTO_COINS.find((c) => c.symbol === alert.symbol)?.name ?? alert.symbol;
    const price = new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-GB', {
      style: 'currency',
      currency: 'EUR',
      maximumSignificantDigits: 8,
    }).format(alert.price);
    return {
      title: copy.title,
      body: `${copy[alert.condition](coin, price)} ${copy.note}`,
      url: '/?tab=crypto',
    };
  }

  private view(userId: string): CryptoAlertsView {
    return {
      alerts: this.repo.alerts(userId).map((a) => ({
        id: a.id,
        symbol: a.symbol,
        condition: a.condition,
        price: a.price,
        createdAt: a.createdAt,
        triggeredAt: a.triggeredAt,
      })),
      max: ALERTS_MAX,
      pushEnabled: this.push.enabled,
    };
  }
}

const reached = (alert: CryptoPriceAlert, price: number): boolean =>
  alert.condition === 'above' ? price >= alert.price : price <= alert.price;
