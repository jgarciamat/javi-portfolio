import type { IApiContext } from '@core/context/ApiContext';
import * as f from './fixtures';

type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? jest.Mock<R, A> : T[K];
};
export type FakeApi = { [K in keyof IApiContext]: Mocked<IApiContext[K]> };

const ok = <T>(value: T) => jest.fn().mockResolvedValue(value);

/** Every API call answered with sensible fixtures; override what a test needs. */
export function createFakeApi(): FakeApi {
  return {
    authApi: {
      register: ok({ message: 'ok' }),
      login: ok({ accessToken: 'a', refreshToken: 'r', user: f.user() }),
      googleLogin: ok({ accessToken: 'a', refreshToken: 'r', user: f.user() }),
      logout: ok(undefined),
      logoutEverywhere: ok(undefined),
      verifyEmail: ok({ message: 'ok' }),
      resendVerification: ok({ message: 'ok' }),
      requestPasswordReset: ok({ message: 'ok' }),
      resetPassword: ok({ message: 'ok' }),
      updateName: ok({ name: 'Ana' }),
      updatePassword: ok({ message: 'ok', accessToken: 'a2', refreshToken: 'r2' }),
      updateAvatar: ok({ avatarUrl: null }),
      deleteAccount: ok(undefined),
    },
    monthApi: { get: ok(f.overview()) },
    transactionApi: {
      create: ok(f.transaction()),
      update: ok(f.transaction()),
      patch: ok(f.transaction()),
      delete: ok(undefined),
      search: ok({ items: [], total: 0, totals: { income: 0, expenses: 0, saving: 0 } }),
      getAnnual: ok({ year: 2026, months: {} }),
      import: ok({ dryRun: true, imported: 0, duplicates: 0, invalid: 0, rows: [] }),
    },
    categoryApi: {
      getAll: ok([]),
      create: ok(f.category()),
      update: ok(f.category()),
      delete: ok(undefined),
    },
    recurringApi: {
      getAll: ok([]),
      create: ok(f.rule()),
      update: ok(f.rule()),
      delete: ok(undefined),
    },
    customAlertApi: {
      getAll: ok([]),
      create: ok(f.customAlert()),
      update: ok(f.customAlert()),
      delete: ok(undefined),
    },
    accountApi: {
      getAll: ok({ accounts: [], total: 0 }),
      create: ok([]),
      update: ok([]),
      delete: ok(undefined),
      transfers: ok([]),
      createTransfer: ok(f.transfer()),
      deleteTransfer: ok(undefined),
    },
    budgetApi: { getAll: ok([]), set: ok(f.budget()), delete: ok(undefined) },
    goalApi: { getAll: ok([]), create: ok(f.goal()), update: ok(f.goal()), delete: ok(undefined) },
    settingsApi: { get: ok(f.settings()), update: ok(f.settings()) },
    insightsApi: {
      trends: ok({ year: 2026, month: 3, categories: [] }),
      netWorth: ok([]),
      forecast: ok(f.forecast()),
      advice: ok(f.advice()),
    },
    dataApi: { exportAll: ok({ transactions: [] }) },
    billingApi: {
      get: ok(f.billing()),
      plans: ok(f.catalog()),
      checkout: ok({ url: 'https://checkout.test' }),
      portal: ok({ url: 'https://portal.test' }),
    },
    offersApi: { list: ok({ enabled: true, offers: [] }), click: ok({ url: 'https://x.test' }) },
  } as unknown as FakeApi;
}
