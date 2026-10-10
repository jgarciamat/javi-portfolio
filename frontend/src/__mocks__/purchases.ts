/** RevenueCat's Capacitor plugin is ESM and native-only: tests drive this stand-in. */
export const Purchases = {
  configure: jest.fn().mockResolvedValue(undefined),
  logIn: jest.fn().mockResolvedValue(undefined),
  getOfferings: jest.fn(),
  purchasePackage: jest.fn().mockResolvedValue(undefined),
  restorePurchases: jest.fn().mockResolvedValue(undefined),
};
