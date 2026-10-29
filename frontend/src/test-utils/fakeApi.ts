import type { IApiContext } from '@core/context/ApiContext';
import * as f from './fixtures';
import { PREMIUM_TERMS, premiumContent } from './learn';
import * as crypto from './crypto';
import type { CryptoInterval, CryptoLive } from '@modules/crypto/domain/types';
import type { Drawing } from '@modules/crypto/domain/drawings';

type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? jest.Mock<R, A> : T[K];
};
export type FakeApi = { [K in keyof IApiContext]: Mocked<IApiContext[K]> };

const ok = <T>(value: T) => jest.fn().mockResolvedValue(value);

function fakeAuthApi(): FakeApi['authApi'] {
  return {
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
    updateAvatar: ok({ avatar: null }),
    deleteAccount: ok(undefined),
    verifyTwoFactor: ok({ accessToken: 'a', refreshToken: 'r', user: f.user() }),
    twoFactorStatus: ok({ enabled: false, enabledAt: null, recoveryCodesRemaining: 0 }),
    twoFactorSetup: ok({
      secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
      otpauthUri: 'otpauth://totp/Finanverso%3Aana%40example.com?secret=JBSWY3DPEHPK3PXP',
    }),
    twoFactorEnable: ok({ recoveryCodes: ['aaaa-bbbb-cccc', 'dddd-eeee-ffff'] }),
    twoFactorDisable: ok(undefined),
    twoFactorRecoveryCodes: ok({ recoveryCodes: ['gggg-hhhh-jjjj', 'kkkk-mmmm-nnnn'] }),
  };
}

function fakeBusinessApi(): FakeApi['businessApi'] {
  return {
    categories: ok([]),
    setCategory: ok(undefined),
    removeCategory: ok(undefined),
    draft: ok(f.autonomoDraft()),
    recordPdf: ok({ used: 1 }),
    data: ok(null),
    saveData: ok({ version: 1, updatedAt: '2026-03-15T12:00:00.000Z' }),
    deleteData: ok(undefined),
    tax: ok({
      year: 2026,
      quarters: [1, 2, 3, 4].map((quarter) => ({
        quarter,
        ...{
          incomeBase: 0,
          vatCollected: 0,
          expenseBase: 0,
          vatPaid: 0,
          vatDue: 0,
          netIncome: 0,
          irpfAdvance: 0,
        },
      })),
      totals: {
        incomeBase: 0,
        vatCollected: 0,
        expenseBase: 0,
        vatPaid: 0,
        vatDue: 0,
        netIncome: 0,
        irpfAdvance: 0,
      },
    }),
  };
}

/** The live tick never answers unless a test says so: the console stays as the full answers left it. */
const silentLive = () =>
  jest.fn<Promise<CryptoLive>, [string, CryptoInterval]>(() => new Promise(() => undefined));

/** The crypto console answered with made-up prices and a portfolio with one purchase. */
function fakeCryptoApi(): FakeApi['cryptoApi'] {
  return {
    coins: ok(crypto.coins()),
    candles: jest.fn((symbol: string, interval: CryptoInterval) =>
      Promise.resolve(crypto.candles(symbol, interval))
    ),
    live: silentLive(),
    portfolio: ok(crypto.portfolio()),
    placeOrder: ok(crypto.portfolio()),
    cancelOrder: ok(crypto.portfolio()),
    setExits: ok(crypto.portfolio()),
    resetPractice: ok(
      crypto.portfolio({
        portfolio: crypto.PRACTICE_REF,
        portfolios: [crypto.SEASON_REF, crypto.PRACTICE_REF],
        open: [],
      })
    ),
    createPractice: ok(
      crypto.portfolio({
        portfolio: crypto.PRACTICE_REF,
        portfolios: [crypto.SEASON_REF, crypto.PRACTICE_REF],
        open: [],
      })
    ),
    deletePractice: ok(crypto.portfolio()),
    ranking: ok(crypto.ranking()),
    setRanking: ok(crypto.ranking()),
    report: ok({
      season: '2026-03',
      finished: false,
      initial: 10_000,
      result: null,
      closed: [],
      stats: {
        winRate: null,
        wins: 0,
        losses: 0,
        best: null,
        worst: null,
        averageWin: null,
        averageLoss: null,
        equityDays: [],
        hold: null,
      },
    }),
    alerts: ok(crypto.alerts()),
    createAlert: ok(crypto.alerts()),
    deleteAlert: ok(crypto.alerts()),
    drawings: jest.fn((symbol: string) => Promise.resolve(crypto.drawings(symbol))),
    saveDrawings: jest.fn((symbol: string, list: Drawing[]) =>
      Promise.resolve(crypto.drawings(symbol, list))
    ),
  };
}

/** Every API call answered with sensible fixtures; override what a test needs. */
export function createFakeApi(): FakeApi {
  return {
    authApi: fakeAuthApi(),
    monthApi: { get: ok(f.overview()) },
    transactionApi: {
      // Someone who already has movements: the sample data is not offered.
      sampleStatus: ok({ sample: 0, movements: 12 }),
      loadSample: ok({ sample: 80, movements: 80 }),
      removeSample: ok({ deleted: 80 }),
      create: ok(f.transaction()),
      update: ok(f.transaction()),
      patch: ok(f.transaction()),
      delete: ok(undefined),
      bulkDelete: ok({ applied: [], skipped: [] }),
      bulkUpdate: ok({ applied: [], skipped: [] }),
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
    pushApi: {
      key: ok({ enabled: true, publicKey: 'BKey' }),
      subscribe: ok(undefined),
      unsubscribe: ok(undefined),
      test: ok({ sent: 1 }),
    },
    splitApi: {
      list: ok([]),
      create: ok({ id: 'g1', name: 'Piso', members: [], expenses: [], transfers: [] }),
      get: ok({ id: 'g1', name: 'Piso', members: [], expenses: [], transfers: [] }),
      remove: ok(undefined),
      addExpense: ok({ id: 'g1', name: 'Piso', members: [], expenses: [], transfers: [] }),
      settle: ok({ id: 'g1', name: 'Piso', members: [], expenses: [], transfers: [] }),
      removeExpense: ok({ id: 'g1', name: 'Piso', members: [], expenses: [], transfers: [] }),
    },
    businessApi: fakeBusinessApi(),
    ratesApi: { get: ok({ from: 'USD', to: 'EUR', rate: 0.9 }) },
    assetApi: {
      getAll: ok([]),
      create: ok({
        id: 'as1',
        name: 'Fondo',
        kind: 'investment',
        interestRate: null,
        minPayment: null,
        value: 100,
        valueDate: '2026-03-01',
        previousValue: null,
        history: [],
      }),
      setValue: ok({
        id: 'as1',
        name: 'Fondo',
        kind: 'investment',
        interestRate: null,
        minPayment: null,
        value: 100,
        valueDate: '2026-03-01',
        previousValue: null,
        history: [],
      }),
      setTerms: ok({
        id: 'as1',
        name: 'Tarjeta',
        kind: 'debt',
        interestRate: 18,
        minPayment: 50,
        value: 1000,
        valueDate: '2026-03-01',
        previousValue: null,
        history: [],
      }),
      remove: ok(undefined),
    },
    rentaApi: { register: ok({ used: 1 }), draft: ok({}) },
    inboxApi: {
      get: ok({ address: 'mm-0123456789abcdef0123@facturas.finanverso.app', recent: [] }),
      rotate: ok({ address: 'mm-fedcba98765432100123@facturas.finanverso.app', recent: [] }),
    },
    categoryRuleApi: {
      getAll: ok([]),
      add: ok({ id: 'r1', pattern: 'x', categoryId: 'c1', categoryName: 'Comida' }),
      remove: ok(undefined),
      suggest: ok({ pattern: 'mercadona', categoryId: null }),
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
      subscriptions: ok(f.subscriptions()),
      moneyLeaks: ok(f.moneyLeaks()),
      decideLeak: ok(f.leakFinding({ status: 'keep' })),
      undoLeak: ok(undefined),
      advice: ok(f.advice()),
      ask: ok(f.answer()),
      report: ok(f.report()),
    },
    dataApi: { exportAll: ok({ transactions: [] }) },
    billingApi: {
      get: ok(f.billing()),
      plans: ok(f.catalog()),
      checkout: ok({ url: 'https://checkout.test' }),
      portal: ok({ url: 'https://portal.test' }),
      acceptTerms: ok(f.billing().terms),
      referral: ok(f.referral()),
    },
    householdApi: {
      status: ok(f.household()),
      invite: ok({ code: 'CODE-123456789', expiresAt: '2026-03-22T12:00:00Z' }),
      cancelInvite: ok(undefined),
      preview: ok({ owner: { id: 'o1', name: 'Marta' }, expiresAt: '2026-03-22T12:00:00Z' }),
      join: ok(undefined),
      leave: ok(undefined),
      remove: ok(undefined),
    },
    offersApi: { list: ok({ enabled: true, offers: [] }), click: ok({ url: 'https://x.test' }) },
    videosApi: { premium: ok(f.premiumVideoIds()) },
    learnApi: {
      chapter: jest.fn((id: string) => Promise.resolve(premiumContent(id))),
      glossary: ok(PREMIUM_TERMS),
    },
    cryptoApi: fakeCryptoApi(),
  } as unknown as FakeApi;
}
