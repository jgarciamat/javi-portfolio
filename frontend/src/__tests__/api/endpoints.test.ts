import { authApi } from '@core/api/authApi';
import { billingApi, offersApi } from '@core/api/billingApi';
import {
  accountApi,
  budgetApi,
  categoryApi,
  customAlertApi,
  dataApi,
  goalApi,
  insightsApi,
  monthApi,
  recurringApi,
  settingsApi,
  transactionApi,
} from '@core/api/financeApi';

const BASE = 'http://localhost:3000/api';
const fetchMock = jest.fn();

beforeEach(() => {
  global.fetch = fetchMock;
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  localStorage.clear();
});

type Case = [string, () => Promise<unknown>, string, string, unknown?];

const cases: Case[] = [
  ['month', () => monthApi.get(2026, 3), 'GET', '/months/2026/3'],
  [
    'create movement',
    () => transactionApi.create({ description: 'a', amount: 1, type: 'EXPENSE', category: 'Ocio' }),
    'POST',
    '/transactions',
    { description: 'a', amount: 1, type: 'EXPENSE', category: 'Ocio' },
  ],
  [
    'update movement',
    () => transactionApi.update('t1', { amount: 2 }),
    'PUT',
    '/transactions/t1',
    { amount: 2 },
  ],
  [
    'patch movement',
    () => transactionApi.patch('t1', { notes: 'n' }),
    'PATCH',
    '/transactions/t1',
    { notes: 'n' },
  ],
  ['delete movement', () => transactionApi.delete('t1'), 'DELETE', '/transactions/t1'],
  [
    'search',
    () => transactionApi.search({ q: 'cine', categoryIds: ['a', 'b'], sort: 'date_desc' }),
    'GET',
    '/transactions/search?q=cine&categoryIds=a%2Cb&sort=date_desc',
  ],
  ['annual', () => transactionApi.getAnnual(2026), 'GET', '/transactions/annual/2026'],
  [
    'import',
    () => transactionApi.import([], { accountId: 'a1', dryRun: true }),
    'POST',
    '/transactions/import',
    { rows: [], accountId: 'a1', dryRun: true },
  ],
  ['categories', () => categoryApi.getAll(), 'GET', '/categories'],
  [
    'create category',
    () => categoryApi.create({ name: 'x', icon: 'y' }),
    'POST',
    '/categories',
    { name: 'x', icon: 'y' },
  ],
  [
    'update category',
    () => categoryApi.update('c1', { name: 'z' }),
    'PATCH',
    '/categories/c1',
    { name: 'z' },
  ],
  ['delete category', () => categoryApi.delete('c1'), 'DELETE', '/categories/c1'],
  [
    'delete category moving its data',
    () => categoryApi.delete('c1', 'c2'),
    'DELETE',
    '/categories/c1?reassignTo=c2',
  ],
  ['rules', () => recurringApi.getAll(), 'GET', '/recurring-rules'],
  [
    'create rule',
    () =>
      recurringApi.create({
        description: 'r',
        amount: 1,
        type: 'EXPENSE',
        category: 'x',
        startYear: 2026,
        startMonth: 1,
      }),
    'POST',
    '/recurring-rules',
  ],
  [
    'update rule',
    () => recurringApi.update('r1', { active: false }),
    'PATCH',
    '/recurring-rules/r1',
    { active: false },
  ],
  ['delete rule', () => recurringApi.delete('r1'), 'DELETE', '/recurring-rules/r1?scope=none'],
  [
    'delete rule with scope',
    () => recurringApi.delete('r1', 'all'),
    'DELETE',
    '/recurring-rules/r1?scope=all',
  ],
  ['alerts', () => customAlertApi.getAll(), 'GET', '/custom-alerts'],
  [
    'create alert',
    () =>
      customAlertApi.create({ name: 'a', metric: 'expenses_pct', operator: 'gte', threshold: 1 }),
    'POST',
    '/custom-alerts',
  ],
  [
    'update alert',
    () => customAlertApi.update('al1', { active: true }),
    'PATCH',
    '/custom-alerts/al1',
    { active: true },
  ],
  ['delete alert', () => customAlertApi.delete('al1'), 'DELETE', '/custom-alerts/al1'],
  ['accounts', () => accountApi.getAll(), 'GET', '/accounts'],
  ['create account', () => accountApi.create({ name: 'A' }), 'POST', '/accounts', { name: 'A' }],
  [
    'update account',
    () => accountApi.update('a1', { archived: true }),
    'PATCH',
    '/accounts/a1',
    { archived: true },
  ],
  ['delete account', () => accountApi.delete('a1'), 'DELETE', '/accounts/a1'],
  ['transfers', () => accountApi.transfers(), 'GET', '/transfers'],
  [
    'create transfer',
    () =>
      accountApi.createTransfer({
        fromAccountId: 'a',
        toAccountId: 'b',
        amount: 1,
        date: '2026-03-01',
      }),
    'POST',
    '/transfers',
  ],
  ['delete transfer', () => accountApi.deleteTransfer('tr1'), 'DELETE', '/transfers/tr1'],
  ['budgets', () => budgetApi.getAll(), 'GET', '/budgets'],
  [
    'set budget',
    () => budgetApi.set('c1', 100),
    'PUT',
    '/budgets',
    { categoryId: 'c1', amount: 100 },
  ],
  ['delete budget', () => budgetApi.delete('b1'), 'DELETE', '/budgets/b1'],
  ['goals', () => goalApi.getAll(), 'GET', '/goals'],
  [
    'create goal',
    () => goalApi.create({ name: 'g', target: 1 }),
    'POST',
    '/goals',
    { name: 'g', target: 1 },
  ],
  [
    'update goal',
    () => goalApi.update('g1', { archived: true }),
    'PATCH',
    '/goals/g1',
    { archived: true },
  ],
  ['delete goal', () => goalApi.delete('g1'), 'DELETE', '/goals/g1'],
  ['settings', () => settingsApi.get(), 'GET', '/settings'],
  [
    'update settings',
    () => settingsApi.update({ currency: 'USD' }),
    'PATCH',
    '/settings',
    { currency: 'USD' },
  ],
  ['trends', () => insightsApi.trends(2026, 3), 'GET', '/stats/trends/2026/3'],
  ['net worth', () => insightsApi.netWorth(), 'GET', '/stats/net-worth?months=12'],
  ['net worth range', () => insightsApi.netWorth(24), 'GET', '/stats/net-worth?months=24'],
  ['subscriptions', () => insightsApi.subscriptions(), 'GET', '/stats/subscriptions'],
  ['forecast', () => insightsApi.forecast(), 'GET', '/stats/forecast?months=6'],
  [
    'forecast without rules',
    () => insightsApi.forecast(3, ['a', 'b']),
    'GET',
    '/stats/forecast?months=3&exclude=a%2Cb',
  ],
  [
    'advice',
    () => insightsApi.advice(2026, 3, 'es'),
    'POST',
    '/ai/advice',
    { year: 2026, month: 3, locale: 'es' },
  ],
  ['export', () => dataApi.exportAll(), 'GET', '/export'],
  ['billing', () => billingApi.get(), 'GET', '/billing'],
  ['plans', () => billingApi.plans(), 'GET', '/billing/plans'],
  [
    'checkout',
    () => billingApi.checkout('monthly', { acceptTerms: true, waiveWithdrawal: true }),
    'POST',
    '/billing/checkout',
    { kind: 'monthly', acceptTerms: true, waiveWithdrawal: true },
  ],
  ['portal', () => billingApi.portal(), 'POST', '/billing/portal'],
  ['offers', () => offersApi.list(), 'GET', '/offers'],
  ['offer click', () => offersApi.click('a b'), 'POST', '/offers/a%20b/click'],
  [
    'register',
    () => authApi.register({ email: 'e', password: 'p', name: 'n' }),
    'POST',
    '/auth/register',
    { email: 'e', password: 'p', name: 'n' },
  ],
  [
    'login',
    () => authApi.login({ email: 'e', password: 'p' }),
    'POST',
    '/auth/login',
    { email: 'e', password: 'p' },
  ],
  [
    'google',
    () => authApi.googleLogin('tok', 'en'),
    'POST',
    '/auth/google',
    { token: 'tok', locale: 'en' },
  ],
  ['logout', () => authApi.logout('r'), 'POST', '/auth/logout', { refreshToken: 'r' }],
  ['logout everywhere', () => authApi.logoutEverywhere(), 'POST', '/auth/logout-all'],
  ['verify', () => authApi.verifyEmail('tok'), 'GET', '/auth/verify-email?token=tok'],
  [
    'resend verification',
    () => authApi.resendVerification('e', 'es'),
    'POST',
    '/auth/resend-verification',
    { email: 'e', locale: 'es' },
  ],
  [
    'forgot password',
    () => authApi.requestPasswordReset('e', 'en'),
    'POST',
    '/auth/forgot-password',
    { email: 'e', locale: 'en' },
  ],
  [
    'reset password',
    () => authApi.resetPassword('tok', 'Nueva-1!'),
    'POST',
    '/auth/reset-password',
    { token: 'tok', newPassword: 'Nueva-1!' },
  ],
  ['rename', () => authApi.updateName('Ana'), 'PATCH', '/profile/name', { name: 'Ana' }],
  [
    'password',
    () => authApi.updatePassword(undefined, 'N'),
    'PATCH',
    '/profile/password',
    { newPassword: 'N' },
  ],
  ['avatar', () => authApi.updateAvatar(null), 'PATCH', '/profile/avatar', { avatarDataUrl: null }],
  ['delete account', () => authApi.deleteAccount(), 'DELETE', '/profile/account'],
];

describe('API endpoints', () => {
  // Every row gets 5 values: a shorter row would make Jest pass `done` as the body.
  const rows = cases.map(
    ([name, call, method, path, body]) => [name, call, method, path, body] as Case
  );
  it.each(rows)('%s', async (_name, call, method, path, body) => {
    await call();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(`${init.method ?? 'GET'} ${url}`).toBe(`${method} ${BASE}${path}`);
    if (body !== undefined) expect(JSON.parse(init.body as string)).toEqual(body);
  });
});
