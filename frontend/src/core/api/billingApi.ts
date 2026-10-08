import type {
  BillingOverview,
  CheckoutConsent,
  CheckoutKind,
  OffersResponse,
  PlanCatalog,
} from '@modules/billing/domain/types';
import { apiRequest, jsonBody, publicRequest } from './http';

export const billingApi = {
  /** Plan, limits, usage and prices of the logged-in user. */
  get() {
    return apiRequest<BillingOverview>('/billing');
  },
  /** Public: prices and limits for the pricing page. */
  plans() {
    return publicRequest<PlanCatalog>('/billing/plans');
  },
  /** Returns the payment page URL to redirect to (after the buyer's consent). */
  checkout(kind: CheckoutKind, consent: CheckoutConsent) {
    return apiRequest<{ url: string }>('/billing/checkout', {
      method: 'POST',
      body: jsonBody({ kind, ...consent }),
    });
  },
  /** Returns the URL of the provider's customer portal (change plan, card, cancel). */
  portal() {
    return apiRequest<{ url: string }>('/billing/portal', { method: 'POST' });
  },
};

export const offersApi = {
  list() {
    return apiRequest<OffersResponse>('/offers');
  },
  /** Records the click (the link itself is opened by the browser). */
  click(id: string) {
    return apiRequest<{ url: string }>(`/offers/${encodeURIComponent(id)}/click`, {
      method: 'POST',
    });
  },
};
