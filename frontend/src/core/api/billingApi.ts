import type {
  BillingOverview,
  CheckoutConsent,
  CheckoutKind,
  HouseholdPerson,
  HouseholdStatus,
  OffersResponse,
  PlanCatalog,
  ReferralSummary,
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
  /** The user's invitation code and what the invitations have earned. */
  referral() {
    return apiRequest<ReferralSummary>('/referral');
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

export const householdApi = {
  status() {
    return apiRequest<HouseholdStatus>('/household');
  },
  /** One-time code (shown once) that lets one person join. */
  invite() {
    return apiRequest<{ code: string; expiresAt: string }>('/household/invite', { method: 'POST' });
  },
  cancelInvite() {
    return apiRequest<void>('/household/invite', { method: 'DELETE' });
  },
  /** Who is inviting, before joining. */
  preview(code: string) {
    return apiRequest<{ owner: HouseholdPerson; expiresAt: string }>(
      `/household/invite/${encodeURIComponent(code)}`
    );
  },
  join(code: string) {
    return apiRequest<void>('/household/join', { method: 'POST', body: jsonBody({ code }) });
  },
  leave() {
    return apiRequest<void>('/household/membership', { method: 'DELETE' });
  },
  remove(memberId: string) {
    return apiRequest<void>(`/household/members/${encodeURIComponent(memberId)}`, {
      method: 'DELETE',
    });
  },
};
