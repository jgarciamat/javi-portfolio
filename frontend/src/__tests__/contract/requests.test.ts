/**
 * Contract, requests side: the bodies the app really sends (built by its own api functions and
 * form code, with `fetch` captured) are compared with `fixtures/requests.json`. The backend
 * contract test replays that same file against the real routes, zod schemas included. So:
 * change what the app sends and this test fails until the file is regenerated
 * (`UPDATE_CONTRACT=1 npx jest contract/requests`); regenerate it and the backend test says
 * whether the API still accepts it.
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { authApi } from '@core/api/authApi';
import { captureCreatorCode, setCreatorConsent } from '@core/creatorCode';
import { billingApi } from '@core/api/billingApi';
import { cryptoApi } from '@core/api/cryptoApi';
import {
  accountApi,
  budgetApi,
  businessApi,
  categoryApi,
  customAlertApi,
  goalApi,
  recurringApi,
  rentaApi,
  settingsApi,
  transactionApi,
} from '@core/api/financeApi';
import { tokenStore } from '@core/api/http';
import { buildInputs } from '@modules/finances/ui/components/autonomoInputs';
import { emptyActivity } from '@modules/finances/ui/components/activityForm';
import { NO_EXTRAS, emptyManual } from '@modules/finances/ui/components/AutonomoManual';
import { toSaved } from '@modules/finances/ui/components/autonomoSync';
import saved from './fixtures/requests.json';

const FILE = resolve(__dirname, 'fixtures/requests.json');
const PASSWORD = 'Sup3r-secret!';

interface Call {
  name: string;
  method: string;
  path: string;
  /** Public endpoints are sent without a session. */
  auth: boolean;
  body: unknown;
}

const calls: { name: string; auth: boolean; run: () => Promise<unknown> }[] = [];
const add = (name: string, run: () => Promise<unknown>, auth = true) =>
  calls.push({ name, auth, run });

// Placeholders the backend test fills in: {category:Name}, {transaction}, {account}, {totp}…
const C = (name: string) => `{category:${name}}`;

const income = { r21: '4321.5', r10: '', r4: '', r0: '' };
const typed = emptyManual();
typed.quarters[0] = {
  income,
  withheld: '648.23',
  expenses: [{ kind: 'software', amount: '121', vatRate: 21, days: '' }],
};
typed.profile = { ...typed.profile, workArea: '12', homeArea: '90', healthPeople: '2' };
typed.invoices = [
  {
    id: 'abc123',
    book: 'issued',
    kind: 'other',
    excluded: false,
    date: '2026-02-10',
    quarter: 1,
    base: 4321.5,
    vatRate: 21,
    vat: 907.52,
    total: 5229.02,
    withheld: 648.23,
    concept: 'Cliente inventado SL',
    period: null,
  },
];

add(
  'register',
  () =>
    authApi.register({
      email: 'nueva@example.com',
      password: PASSWORD,
      name: 'Nueva',
      locale: 'es',
    }),
  false
);
add(
  'registerCreator',
  () => {
    // A visit from a creator's link whose box was ticked at sign-up.
    captureCreatorCode('?aff=lola');
    setCreatorConsent(true);
    return authApi.register({
      email: 'creadora@example.com',
      password: PASSWORD,
      name: 'Lola',
      locale: 'es',
    });
  },
  false
);
add('login', () => authApi.login({ email: 'ana@example.com', password: PASSWORD }), false);
add('twoFactorSetup', () => authApi.twoFactorSetup({ password: PASSWORD }));
add('twoFactorEnable', () => authApi.twoFactorEnable('{totp}'));
add('twoFactorVerify', () => authApi.verifyTwoFactor('{challenge}', '{totp}'), false);
add('twoFactorRecoveryCodes', () => authApi.twoFactorRecoveryCodes({ code: '{totp}' }));
add('twoFactorDisable', () => authApi.twoFactorDisable({ password: PASSWORD }));
add('profileName', () => authApi.updateName('Ana Inventada'));
add('profileAvatar', () => authApi.updateAvatar('🦊'));
add('transactionCreate', () =>
  transactionApi.create({
    description: 'Cena',
    amount: 12.5,
    type: 'EXPENSE',
    category: 'Ocio',
    date: '2026-03-10',
    notes: null,
  })
);
add('transactionUpdate', () =>
  transactionApi.update('{transaction}', {
    description: 'Cena con amigos',
    amount: 20,
    type: 'EXPENSE',
    category: 'Ocio',
    accountId: null,
    date: '2026-03-11',
    notes: 'Nota',
  })
);
add('transactionNotes', () => transactionApi.patch('{transaction}', { notes: 'Una nota' }));
add('transactionBulkUpdate', () =>
  transactionApi.bulkUpdate(['{transaction}'], {
    categoryId: C('Ocio'),
    notes: 'Revisado',
    notesMode: 'append',
  })
);
add('transactionBulkDelete', () => transactionApi.bulkDelete(['{transaction}']));
add('importPreview', () =>
  transactionApi.import(
    [
      { date: '2026-03-02', description: 'Mercadona', amount: -23.4 },
      { date: '2026-03-03', description: 'Nómina', amount: 1500, category: 'Salario' },
    ],
    { dryRun: true, useAi: false }
  )
);
add('importCommit', () =>
  transactionApi.import(
    [{ date: '2026-03-04', description: 'Gasolina', amount: -40, type: 'EXPENSE', notes: null }],
    { accountId: null, dryRun: false, useAi: false, source: 'statement' }
  )
);
add('categoryCreate', () => categoryApi.create({ name: 'Mascotas', icon: '🐶', color: '#aabbcc' }));
add('accountCreate', () =>
  accountApi.create({ name: 'Cuenta nómina', type: 'checking', initialBalance: 100 })
);
add('budgetSet', () => budgetApi.set(C('Ocio'), 150));
add('goalCreate', () => goalApi.create({ name: 'Viaje', target: 500, targetDate: '2027-01-01' }));
add('recurringCreate', () =>
  recurringApi.create({
    description: 'Alquiler',
    amount: 700,
    type: 'EXPENSE',
    category: 'Ocio',
    startYear: 2026,
    startMonth: 1,
    frequency: 'monthly',
  })
);
add('customAlertCreate', () =>
  customAlertApi.create({
    name: 'Ocio alto',
    metric: 'category_amount',
    operator: 'gte',
    threshold: 100,
    category: 'Ocio',
  })
);
add('settingsUpdate', () => settingsApi.update({ currency: 'EUR', monthStartDay: 1 }));
add('businessSetCategory', () => businessApi.setCategory(C('Salario'), 21));
add('autonomoSaveEmpty', () => businessApi.saveData(toSaved(emptyManual(), NO_EXTRAS, {}), null));
add('autonomoSaveTyped', () =>
  businessApi.saveData(
    toSaved(typed, { ...NO_EXTRAS, hardToJustify: true }, { 'proveedor x': 'software' }),
    1
  )
);
add('autonomoDraftEmpty', () =>
  businessApi.draft(2026, 1, buildInputs(emptyManual(), NO_EXTRAS, 2026, 1))
);
add('autonomoDraftTyped', () =>
  businessApi.draft(2026, 1, buildInputs(typed, { ...NO_EXTRAS, hardToJustify: true }, 2026, 1))
);
// A 1T filed at −1,000 and corrected later: box 07 and 19 as filed go to the draft and the account.
const filed = {
  ...typed,
  filed130: ['-1000', '', '', ''],
  activity: { ...emptyActivity(), paid130: ['0', '', '', ''] },
};
add('autonomoSaveFiled', () => businessApi.saveData(toSaved(filed, NO_EXTRAS, {}), 2));
add('autonomoDraftFiled', () => businessApi.draft(2026, 2, buildInputs(filed, NO_EXTRAS, 2026, 2)));
add('checkoutMonthly', () =>
  billingApi.checkout('monthly', { acceptTerms: true, waiveWithdrawal: true })
);
add('checkoutRentaPass', () =>
  billingApi.checkout('renta_pass', { acceptTerms: true, waiveWithdrawal: true })
);
add('rentaCalculation', () => rentaApi.register());
// Crypto console (play money): purchases, sales of the purchase {position} and the settings.
add('cryptoBuyMarket', () =>
  cryptoApi.placeOrder({ action: 'buy', symbol: 'BTC', type: 'market', amount: 1000 })
);
add('cryptoBuyWithExits', () =>
  cryptoApi.placeOrder({
    action: 'buy',
    symbol: 'BTC',
    type: 'market',
    amount: 500,
    takeProfit: 60000,
    stopLoss: 45000,
  })
);
add('cryptoShort', () =>
  cryptoApi.placeOrder({
    action: 'buy',
    symbol: 'BTC',
    direction: 'short',
    type: 'market',
    amount: 300,
    takeProfit: 40000,
    stopLoss: 55000,
  })
);
add('cryptoBuyLimit', () =>
  cryptoApi.placeOrder({ action: 'buy', symbol: 'BTC', type: 'limit', amount: 250.5, price: 40000 })
);
add('cryptoSellLimit', () =>
  cryptoApi.placeOrder({ action: 'sell', positionId: '{position}', type: 'limit', price: 60000 })
);
add('cryptoSellMarket', () =>
  cryptoApi.placeOrder({ action: 'sell', positionId: '{position}', type: 'market' })
);
add('cryptoExits', () => cryptoApi.setExits('{position}', { takeProfit: 61000, stopLoss: null }));
add('cryptoPractice', () => cryptoApi.createPractice());
add('cryptoBuyPractice', () =>
  cryptoApi.placeOrder({
    action: 'buy',
    portfolioId: '{practice}',
    symbol: 'ETH',
    type: 'market',
    amount: 100,
  })
);
add('cryptoResetPractice', () => cryptoApi.resetPractice('{practice}'));
add('cryptoDeletePractice', () => cryptoApi.deletePractice('{practice}'));
add('cryptoRanking', () => cryptoApi.setRanking({ alias: 'Lince' }));
add('cryptoAlert', () =>
  cryptoApi.createAlert({ symbol: 'BTC', condition: 'above', price: 60000 })
);
add('cryptoDeleteAlert', () => cryptoApi.deleteAlert('{alert}'));

describe('what the app sends', () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    localStorage.clear();
    // A session that has not expired: no refresh in the middle.
    const payload = btoa(JSON.stringify({ sub: 'u', exp: Math.floor(Date.now() / 1000) + 3600 }));
    tokenStore.setSession(`eyJhbGciOiJIUzI1NiJ9.${payload}.sig`, 'refresh');
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    global.fetch = mockFetch;
  });

  it('is the same as the file the backend replays', async () => {
    const captured: Call[] = [];
    for (const { name, auth, run } of calls) {
      mockFetch.mockClear();
      await run();
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      captured.push({
        name,
        method: init.method ?? 'GET',
        // Placeholders survive encodeURIComponent: «%7Bpractice%7D» is «{practice}».
        path: url.replace('http://localhost:3000/api', '').replace(/%7B([\w:]+)%7D/g, '{$1}'),
        auth,
        body: init.body === undefined ? null : JSON.parse(init.body as string),
      });
    }
    if (process.env.UPDATE_CONTRACT) {
      writeFileSync(FILE, `${JSON.stringify(captured, null, 2)}\n`);
      return;
    }
    expect(captured).toEqual(saved);
  });
});
