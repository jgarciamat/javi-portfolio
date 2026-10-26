import { Capacitor } from '@capacitor/core';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { I18nProvider } from '@core/i18n/I18nContext';
import * as notifications from '@core/notifications/notifications';
import { endedMonthOf, nextMonthStarts } from '@modules/finances/domain/importReminders';
import {
  importReminders,
  useImportReminders,
} from '@modules/finances/application/hooks/useImportReminders';

jest.mock('@core/notifications/notifications', () => ({
  IMPORT_URL: '/?importar=1',
  hasNotificationPermission: jest.fn(),
  scheduleMonthlyReminders: jest.fn().mockResolvedValue(undefined),
  cancelMonthlyReminder: jest.fn().mockResolvedValue(undefined),
  onNotificationTap: jest.fn(),
}));
const mocked = jest.mocked(notifications);

const t = (key: string, vars?: Record<string, string | number>) =>
  `${key}${vars ? JSON.stringify(vars) : ''}`;

describe('nextMonthStarts', () => {
  it('gives the next three mornings when the month starts, also across the new year', () => {
    const days = nextMonthStarts(new Date(2026, 10, 1, 10, 0), 1);
    expect(days.map((d) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()])).toEqual(
      [
        [2026, 12, 1, 9],
        [2027, 1, 1, 9],
        [2027, 2, 1, 9],
      ]
    );
    // Before 9:00 on the day, that same morning counts.
    expect(nextMonthStarts(new Date(2026, 9, 25, 8, 0), 25, 1)[0].getDate()).toBe(25);
    expect(endedMonthOf(new Date(2027, 0, 1)).getMonth()).toBe(11);
  });

  it('names the month that has just ended in the language of the person', () => {
    const now = new Date(2026, 9, 26, 12, 0);
    expect(importReminders(1, t, 'es', now)[0].title).toBe(
      'app.notifications.statementTitle{"month":"octubre"}'
    );
    expect(importReminders(1, t, 'en', now)[1].title).toBe(
      'app.notifications.statementTitle{"month":"November"}'
    );
    expect(importReminders(1, t, 'es')).toHaveLength(3);
  });
});

describe('useImportReminders in the Android app', () => {
  let tap: ((url: string) => void) | null = null;
  const remove = jest.fn();
  let location = '';

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/']}>
      <I18nProvider>{children}</I18nProvider>
    </MemoryRouter>
  );
  const run = (enabled: boolean, startDay: number | null) =>
    renderHook(
      () => {
        useImportReminders(enabled, startDay);
        location = useLocation().search;
      },
      { wrapper }
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    mocked.onNotificationTap.mockImplementation(async (open) => {
      tap = open;
      return remove;
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('plans the reminders with permission and opens the importer on a tap', async () => {
    mocked.hasNotificationPermission.mockResolvedValue(true);
    const view = run(true, 1);
    await waitFor(() => expect(mocked.scheduleMonthlyReminders).toHaveBeenCalled());
    expect(mocked.scheduleMonthlyReminders.mock.calls[0][0]).toHaveLength(3);
    await waitFor(() => expect(tap).not.toBeNull());
    act(() => tap!('/?importar=1'));
    expect(location).toBe('?importar=1');
    view.unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('removes them when notifications are off, without permission or without settings', async () => {
    mocked.hasNotificationPermission.mockResolvedValue(false);
    run(false, 1);
    run(true, null);
    run(true, 1);
    await waitFor(() => expect(mocked.cancelMonthlyReminder).toHaveBeenCalledTimes(3));
    expect(mocked.scheduleMonthlyReminders).not.toHaveBeenCalled();
  });

  it('stops listening when it unmounts before the listener is ready', async () => {
    mocked.hasNotificationPermission.mockRejectedValue(new Error('no plugin'));
    run(true, 1).unmount();
    await waitFor(() => expect(remove).toHaveBeenCalled());
  });

  it('does nothing on the web', () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    run(true, 1);
    expect(mocked.onNotificationTap).not.toHaveBeenCalled();
    expect(mocked.hasNotificationPermission).not.toHaveBeenCalled();
  });
});
