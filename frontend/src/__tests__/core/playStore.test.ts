/* eslint-disable @typescript-eslint/no-require-imports -- isolateModules needs require() */
type PlayStore = typeof import('@core/billing/playStore');

/** Fresh module (it remembers which user RevenueCat was configured for). */
function load(key: string, native = true): PlayStore {
  let mod!: PlayStore;
  jest.isolateModules(() => {
    jest.doMock('@shared/utils/platform', () => ({ isNativeApp: () => native }));
    jest.doMock('@core/config/api.config', () => ({ REVENUECAT_ANDROID_KEY: key }));
    mod = require('@core/billing/playStore') as PlayStore;
    // The stand-in plugin is reloaded with the module: keep this copy for the assertions.
    purchases = (require('@revenuecat/purchases-capacitor') as { Purchases: typeof purchases })
      .Purchases;
  });
  return mod;
}

let purchases: Record<string, jest.Mock>;
const offering = { monthly: { id: 'm' }, annual: { id: 'a' }, lifetime: { id: 'l' } };

const loadReady = (key = 'goog_key'): PlayStore => {
  const store = load(key);
  purchases.getOfferings.mockResolvedValue({ current: offering });
  return store;
};
afterEach(() => jest.restoreAllMocks());

describe('playBillingAvailable', () => {
  it('needs the Android app and the RevenueCat key', () => {
    expect(load('goog_key').playBillingAvailable()).toBe(true);
    expect(load('').playBillingAvailable()).toBe(false);
    expect(load('goog_key', false).playBillingAvailable()).toBe(false);
  });
});

describe('purchasePremium', () => {
  it('buys the package of the plan, configuring RevenueCat with our user id once', async () => {
    const store = loadReady();
    await expect(store.purchasePremium('yearly', 'u1')).resolves.toBe(true);
    await store.purchasePremium('monthly', 'u1');
    await store.purchasePremium('lifetime', 'u1');
    expect(purchases.configure).toHaveBeenCalledTimes(1);
    expect(purchases.configure).toHaveBeenCalledWith({ apiKey: 'goog_key', appUserID: 'u1' });
    expect(purchases.purchasePackage.mock.calls.map(([a]) => a.aPackage.id)).toEqual([
      'a',
      'm',
      'l',
    ]);
  });

  it('switches RevenueCat to the new user when another person signs in', async () => {
    const store = loadReady();
    await store.purchasePremium('monthly', 'u1');
    await store.purchasePremium('monthly', 'u2');
    expect(purchases.logIn).toHaveBeenCalledWith({ appUserID: 'u2' });
  });

  it('reports a cancelled purchase as false and surfaces other errors', async () => {
    const store = loadReady();
    purchases.purchasePackage.mockRejectedValueOnce({ userCancelled: true });
    await expect(store.purchasePremium('monthly', 'u1')).resolves.toBe(false);
    purchases.purchasePackage.mockRejectedValueOnce(new Error('billing unavailable'));
    await expect(store.purchasePremium('monthly', 'u1')).rejects.toThrow('billing unavailable');
    purchases.purchasePackage.mockRejectedValueOnce(null);
    await expect(store.purchasePremium('monthly', 'u1')).rejects.toBeNull();
  });

  it('fails when the plan is not in the store offering', async () => {
    const store = loadReady();
    purchases.getOfferings.mockResolvedValueOnce({ current: null });
    await expect(store.purchasePremium('monthly', 'u1')).rejects.toThrow('not available');
  });
});

describe('restorePurchases', () => {
  it('asks Google Play for what the account already bought', async () => {
    const store = loadReady();
    await store.restorePurchases('u1');
    expect(purchases.restorePurchases).toHaveBeenCalled();
  });
});
