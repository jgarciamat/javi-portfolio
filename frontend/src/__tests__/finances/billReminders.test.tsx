import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { upcomingBills } from '@modules/finances/domain/billReminders';
import { useBillReminders } from '@modules/finances/application/hooks/useBillReminders';
import type { RecurringRule } from '@modules/finances/domain/types';
import { ApiProvider } from '@core/context/ApiContext';
import { I18nProvider } from '@core/i18n/I18nContext';
import { SettingsProvider } from '@core/settings/SettingsContext';
import { AuthProvider } from '@shared/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import * as f from '@test-utils/fixtures';
import { createFakeApi } from '@test-utils/fakeApi';
import { signIn, tr } from '@test-utils/render';

const rule = (over: Partial<RecurringRule> = {}): RecurringRule =>
  f.rule({
    type: 'EXPENSE',
    amount: 100,
    startYear: 2026,
    startMonth: 1,
    frequency: 'monthly',
    ...over,
  });

const current = { year: 2026, month: 3, start: '2026-03-01' };
const now = new Date('2026-03-15T12:00:00');

describe('upcomingBills', () => {
  it('reminds the morning before each of the next periods that charges something', () => {
    const reminders = upcomingBills([rule({ amount: 700 }), rule({ amount: 30 })], current, now);
    expect(reminders).toHaveLength(3);
    expect(reminders[0]).toEqual({ at: new Date(2026, 3, 0, 9, 0, 0), count: 2, total: 730 });
    expect(reminders[0].at.getDate()).toBe(31);
    expect(reminders[1].at.getMonth()).toBe(3);
  });

  it('follows the frequency, the end date and what is active, and ignores incomes', () => {
    const rules = [
      rule({ frequency: 'quarterly', startMonth: 3, amount: 10 }),
      rule({ frequency: 'bimonthly', startMonth: 2, endYear: 2026, endMonth: 4, amount: 20 }),
      rule({ active: false, amount: 40 }),
      rule({ type: 'INCOME', amount: 5000 }),
      rule({ startYear: 2026, startMonth: 5, amount: 80 }),
      rule({ frequency: 'yearly', startMonth: 4, amount: 160 }),
    ];
    const reminders = upcomingBills(rules, current, now);
    // April: yearly (160) and bimonthly from Feb (Apr is Feb+2): 20. May: starts-in-May rule (80).
    // June: quarterly from March (Mar+3) 10.
    expect(reminders.map((r) => r.total)).toEqual([180, 80, 10 + 80]);
  });

  it('skips periods that already began, and wraps over the year end', () => {
    const late = new Date('2026-04-01T00:00:00');
    expect(upcomingBills([rule()], current, late).length).toBe(2);
    const december = upcomingBills([rule()], { year: 2026, month: 12, start: '2026-12-01' }, now);
    expect(december.map((r) => r.at.getFullYear())).toEqual([2026, 2027, 2027]);
    expect(upcomingBills([], current, now)).toEqual([]);
  });

  it('works with a month that starts on another day', () => {
    const [first] = upcomingBills([rule()], { year: 2026, month: 4, start: '2026-03-25' }, now);
    expect(first.at).toEqual(new Date(2026, 3, 24, 9, 0, 0));
  });
});

describe('useBillReminders', () => {
  const plugin = { checkPermissions: jest.fn(), schedule: jest.fn(), cancel: jest.fn() };
  jest.mock('@capacitor/local-notifications', () => ({ LocalNotifications: plugin }));

  const setup = (enabled: boolean, native = true, granted = true, fails = false) => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(native);
    plugin.checkPermissions.mockResolvedValue({ display: granted ? 'granted' : 'denied' });
    plugin.cancel.mockResolvedValue(undefined);
    plugin.schedule.mockResolvedValue(undefined);
    const api = createFakeApi();
    if (fails) api.recurringApi.getAll.mockRejectedValue(new Error('offline'));
    else api.recurringApi.getAll.mockResolvedValue([rule({ amount: 700 })]);
    localStorage.setItem('mm_locale', 'es');
    signIn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider>
        <AuthProvider>
          <ApiProvider value={api}>
            <SettingsProvider>{children}</SettingsProvider>
          </ApiProvider>
        </AuthProvider>
      </I18nProvider>
    );
    const view = renderHook(
      ({ on }) => useBillReminders(on, { year: 2099, month: 3, start: '2099-03-01' }),
      { wrapper, initialProps: { on: enabled } }
    );
    return { api, view };
  };

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('plans the reminders of the next periods in the Android app', async () => {
    const { api } = setup(true);
    await waitFor(() => expect(plugin.schedule).toHaveBeenCalled());
    expect(api.recurringApi.getAll).toHaveBeenCalled();
    const { notifications } = plugin.schedule.mock.calls[0][0];
    expect(notifications[0]).toMatchObject({
      title: tr('app.notifications.billsTitle'),
      body: expect.stringContaining('1 operaciones por'),
    });
  });

  it('clears the reminders when notifications are off or not allowed', async () => {
    setup(false);
    await waitFor(() => expect(plugin.cancel).toHaveBeenCalled());
    expect(plugin.schedule).not.toHaveBeenCalled();
    plugin.cancel.mockClear();
    setup(true, true, false);
    await waitFor(() => expect(plugin.cancel).toHaveBeenCalled());
    expect(plugin.schedule).not.toHaveBeenCalled();
  });

  it('does nothing in a browser', async () => {
    const { api } = setup(true, false);
    await new Promise((r) => setTimeout(r, 20));
    expect(api.recurringApi.getAll).not.toHaveBeenCalled();
    expect(plugin.schedule).not.toHaveBeenCalled();
  });

  it('does not plan when the screen went away before the rules arrived', async () => {
    const api = createFakeApi();
    let resolve: (rules: RecurringRule[]) => void = () => undefined;
    api.recurringApi.getAll.mockReturnValue(new Promise((r) => (resolve = r)));
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    plugin.checkPermissions.mockResolvedValue({ display: 'granted' });
    localStorage.setItem('mm_locale', 'es');
    signIn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider>
        <AuthProvider>
          <ApiProvider value={api}>
            <SettingsProvider>{children}</SettingsProvider>
          </ApiProvider>
        </AuthProvider>
      </I18nProvider>
    );
    const view = renderHook(
      () => useBillReminders(true, { year: 2099, month: 3, start: '2099-03-01' }),
      {
        wrapper,
      }
    );
    await waitFor(() => expect(api.recurringApi.getAll).toHaveBeenCalled());
    view.unmount();
    resolve([rule()]);
    await new Promise((r) => setTimeout(r, 20));
    expect(plugin.schedule).not.toHaveBeenCalled();
  });

  it('survives a failing request', async () => {
    const { api } = setup(true, true, true, true);
    await waitFor(() => expect(api.recurringApi.getAll).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(plugin.schedule).not.toHaveBeenCalled();
  });
});
