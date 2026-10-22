import type {
  CryptoCandles,
  CryptoCoins,
  CryptoInterval,
  CryptoRanking,
  PortfolioOrder,
  PriceAlerts,
  SeasonReport,
  SimPortfolio,
} from '@modules/crypto/domain/types';
import { apiRequest, jsonBody, query } from './http';

/**
 * «Consola crypto»: market data comes through our API (never straight from a third party) and
 * the simulator uses play money only.
 */
export const cryptoApi = {
  coins() {
    return apiRequest<CryptoCoins>('/crypto/coins');
  },
  candles(symbol: string, interval: CryptoInterval) {
    return apiRequest<CryptoCandles>(`/crypto/candles${query({ symbol, interval })}`);
  },
  /** A portfolio of the person (the official one of the month when not given). */
  portfolio(portfolioId?: string) {
    return apiRequest<SimPortfolio>(
      `/crypto/sim${portfolioId ? query({ portfolio: portfolioId }) : ''}`
    );
  },
  placeOrder(order: PortfolioOrder) {
    return apiRequest<SimPortfolio>('/crypto/sim/orders', {
      method: 'POST',
      body: jsonBody(order),
    });
  },
  cancelOrder(id: string) {
    return apiRequest<SimPortfolio>(`/crypto/sim/orders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
  /** «Start again» of a practice portfolio: 10.000 € again. */
  resetPractice(portfolioId: string) {
    return apiRequest<SimPortfolio>('/crypto/sim/reset', {
      method: 'POST',
      body: jsonBody({ portfolioId }),
    });
  },
  createPractice() {
    return apiRequest<SimPortfolio>('/crypto/sim/practice', { method: 'POST' });
  },
  deletePractice(portfolioId: string) {
    return apiRequest<SimPortfolio>(`/crypto/sim/practice/${encodeURIComponent(portfolioId)}`, {
      method: 'DELETE',
    });
  },
  ranking() {
    return apiRequest<CryptoRanking>('/crypto/ranking');
  },
  /** Changes the alias of the ranking (everybody is in). */
  setRanking(settings: { alias: string }) {
    return apiRequest<CryptoRanking>('/crypto/ranking/settings', {
      method: 'PUT',
      body: jsonBody(settings),
    });
  },
  /** The full report of a season (Premium). */
  report(season: string) {
    return apiRequest<SeasonReport>(`/crypto/seasons/${encodeURIComponent(season)}/report`);
  },
  alerts() {
    return apiRequest<PriceAlerts>('/crypto/alerts');
  },
  createAlert(alert: { symbol: string; condition: 'above' | 'below'; price: number }) {
    return apiRequest<PriceAlerts>('/crypto/alerts', { method: 'POST', body: jsonBody(alert) });
  },
  deleteAlert(id: string) {
    return apiRequest<PriceAlerts>(`/crypto/alerts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
