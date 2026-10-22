import type {
  CryptoCandles,
  CryptoCoins,
  CryptoInterval,
  OrderRequest,
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
  portfolio() {
    return apiRequest<SimPortfolio>('/crypto/sim');
  },
  placeOrder(order: OrderRequest) {
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
  reset(initial: number, feeBps: number) {
    return apiRequest<SimPortfolio>('/crypto/sim/reset', {
      method: 'POST',
      body: jsonBody({ initial, feeBps }),
    });
  },
  setFee(feeBps: number) {
    return apiRequest<SimPortfolio>('/crypto/sim/settings', {
      method: 'PATCH',
      body: jsonBody({ feeBps }),
    });
  },
};
