import { Purchases } from '@revenuecat/purchases-capacitor';
import { REVENUECAT_ANDROID_KEY } from '@core/config/api.config';
import { isNativeApp } from '@shared/utils/platform';
import type { CheckoutKind } from '@modules/billing/domain/types';

/** Where Google Play lets people see, change and cancel their subscriptions. */
export const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

/** Premium can be bought with Google Play inside the Android app (needs the RevenueCat key). */
export function playBillingAvailable(): boolean {
  return isNativeApp() && REVENUECAT_ANDROID_KEY !== '';
}

/** The package of each plan in RevenueCat's current offering. */
const PACKAGE_OF = { monthly: 'monthly', yearly: 'annual', lifetime: 'lifetime' } as const;

let configuredFor: string | null = null;

/** RevenueCat identifies the buyer with our own user id: the webhook then knows who paid. */
async function configure(userId: string): Promise<void> {
  if (configuredFor === null) {
    await Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY, appUserID: userId });
  } else if (configuredFor !== userId) {
    await Purchases.logIn({ appUserID: userId });
  }
  configuredFor = userId;
}

/** Whether the person closed the Google Play sheet without buying. */
function wasCancelled(error: unknown): boolean {
  return (error as { userCancelled?: boolean } | null)?.userCancelled === true;
}

/**
 * Opens the Google Play purchase sheet for a plan. Resolves with `false` when the person
 * cancels, `true` after a purchase; the backend learns about it through RevenueCat's webhook.
 */
export async function purchasePremium(kind: CheckoutKind, userId: string): Promise<boolean> {
  await configure(userId);
  const offerings = await Purchases.getOfferings();
  const aPackage = offerings.current?.[PACKAGE_OF[kind]];
  if (!aPackage) throw new Error('Plan not available in Google Play');
  try {
    await Purchases.purchasePackage({ aPackage });
    return true;
  } catch (e) {
    if (wasCancelled(e)) return false;
    throw e;
  }
}

/** Gives back what the person already bought with this Google account (reinstall, new phone). */
export async function restorePurchases(userId: string): Promise<void> {
  await configure(userId);
  await Purchases.restorePurchases();
}
