import { Capacitor } from '@capacitor/core';
import {
  cancelMonthlyReminder,
  hasNotificationPermission,
  notificationId,
  notificationsSupported,
  requestNotificationPermission,
  scheduleBillReminders,
  cancelBillReminders,
  scheduleMonthlyReminders,
  onNotificationTap,
  showNotification,
} from '@core/notifications/notifications';

const plugin = {
  requestPermissions: jest.fn(),
  checkPermissions: jest.fn(),
  schedule: jest.fn(),
  cancel: jest.fn(),
  addListener: jest.fn(),
};
jest.mock('@capacitor/local-notifications', () => ({ LocalNotifications: plugin }));

const setNative = (native: boolean) =>
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(native);

class FakeNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = jest.fn();
  static created: unknown[] = [];
  constructor(...args: unknown[]) {
    FakeNotification.created.push(args);
  }
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  // @ts-expect-error test cleanup
  delete window.Notification;
  FakeNotification.created = [];
});

describe('native (Android / iOS)', () => {
  beforeEach(() => setNative(true));

  it('asks for and checks permission with the plugin', async () => {
    plugin.requestPermissions.mockResolvedValue({ display: 'granted' });
    plugin.checkPermissions.mockResolvedValue({ display: 'denied' });
    expect(notificationsSupported()).toBe(true);
    expect(await requestNotificationPermission()).toBe(true);
    expect(await hasNotificationPermission()).toBe(false);
  });

  it('schedules notifications and the monthly reminder', async () => {
    await showNotification(7, 'T', 'B');
    expect(plugin.schedule).toHaveBeenCalledWith({
      notifications: [{ id: 7, title: 'T', body: 'B' }],
    });
    const at = new Date('2026-11-01T09:00:00');
    await scheduleMonthlyReminders(
      ['A', 'B', 'C', 'D'].map((title) => ({ at, title, body: 'Son 30 segundos' }))
    );
    expect(plugin.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 1001 }, { id: 1002 }, { id: 1003 }],
    });
    const { notifications } = plugin.schedule.mock.lastCall[0];
    expect(notifications).toHaveLength(3);
    expect(notifications[0]).toEqual({
      id: 1001,
      title: 'A',
      body: 'Son 30 segundos',
      schedule: { at, allowWhileIdle: true },
      extra: { url: '/?importar=1' },
    });
    plugin.schedule.mockClear();
    await scheduleMonthlyReminders([]);
    expect(plugin.schedule).not.toHaveBeenCalled();
    await cancelMonthlyReminder();
    expect(plugin.cancel).toHaveBeenCalledTimes(3);
  });

  it('opens the address of a tapped notification, only an address of the app', async () => {
    const remove = jest.fn();
    let listener!: (action: { notification: { extra?: { url?: unknown } } }) => void;
    plugin.addListener.mockImplementation(async (_event, fn) => {
      listener = fn;
      return { remove };
    });
    const open = jest.fn();
    const stop = await onNotificationTap(open);
    expect(plugin.addListener).toHaveBeenCalledWith('localNotificationActionPerformed', listener);
    listener({ notification: { extra: { url: '/?importar=1' } } });
    listener({ notification: { extra: { url: 'https://example.com' } } });
    listener({ notification: {} });
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('/?importar=1');
    stop();
    expect(remove).toHaveBeenCalled();
  });
});

describe('bill reminders in the Android app', () => {
  beforeEach(() => setNative(true));

  it('replaces the planned reminders, at most three, and clears them when there are none', async () => {
    const at = new Date('2026-04-30T09:00:00');
    await scheduleBillReminders([
      { at, title: 'A', body: '1' },
      { at, title: 'B', body: '2' },
      { at, title: 'C', body: '3' },
      { at, title: 'D', body: '4' },
    ]);
    expect(plugin.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 1011 }, { id: 1012 }, { id: 1013 }],
    });
    const { notifications } = plugin.schedule.mock.calls[0][0];
    expect(notifications.map((n: { id: number }) => n.id)).toEqual([1011, 1012, 1013]);
    expect(notifications[0]).toMatchObject({ title: 'A', schedule: { at, allowWhileIdle: true } });
    plugin.schedule.mockClear();
    await scheduleBillReminders([]);
    expect(plugin.schedule).not.toHaveBeenCalled();
    plugin.cancel.mockClear();
    await cancelBillReminders();
    expect(plugin.cancel).toHaveBeenCalledTimes(1);
  });
});

describe('browser', () => {
  beforeEach(() => setNative(false));

  it('is unsupported without the Notification API', async () => {
    expect(notificationsSupported()).toBe(false);
    expect(await requestNotificationPermission()).toBe(false);
    expect(await hasNotificationPermission()).toBe(false);
    await showNotification(1, 'T', 'B');
    await scheduleMonthlyReminders([{ at: new Date(), title: 'T', body: 'B' }]);
    await cancelMonthlyReminder();
    (await onNotificationTap(jest.fn()))();
    await scheduleBillReminders([{ at: new Date(), title: 'T', body: 'B' }]);
    await cancelBillReminders();
    expect(plugin.schedule).not.toHaveBeenCalled();
  });

  it('asks the browser for permission', async () => {
    Object.assign(window, { Notification: FakeNotification });
    FakeNotification.permission = 'granted';
    expect(await requestNotificationPermission()).toBe(true);
    FakeNotification.permission = 'default';
    FakeNotification.requestPermission.mockResolvedValue('denied');
    expect(await requestNotificationPermission()).toBe(false);
    expect(await hasNotificationPermission()).toBe(false);
  });

  it('shows notifications through the service worker when there is one', async () => {
    Object.assign(window, { Notification: FakeNotification });
    FakeNotification.permission = 'default';
    await showNotification(1, 'T', 'B');
    expect(FakeNotification.created).toHaveLength(0);

    FakeNotification.permission = 'granted';
    await showNotification(2, 'T', 'B');
    expect(FakeNotification.created).toHaveLength(1);

    const showSW = jest.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistration: jest.fn().mockResolvedValue({ showNotification: showSW }) },
    });
    await showNotification(3, 'T', 'B');
    expect(showSW).toHaveBeenCalledWith('T', expect.objectContaining({ body: 'B', tag: '3' }));
    // @ts-expect-error test cleanup
    delete navigator.serviceWorker;
  });
});

describe('notificationId', () => {
  it('is stable and above the reserved ids', () => {
    expect(notificationId('a')).toBe(notificationId('a'));
    expect(notificationId('a')).not.toBe(notificationId('b'));
    expect(notificationId('')).toBe(2000);
  });
});
