import { Capacitor } from '@capacitor/core';
import {
  cancelMonthlyReminder,
  hasNotificationPermission,
  notificationId,
  notificationsSupported,
  requestNotificationPermission,
  scheduleMonthlyReminder,
  showNotification,
} from '@core/notifications/notifications';

const plugin = {
  requestPermissions: jest.fn(),
  checkPermissions: jest.fn(),
  schedule: jest.fn(),
  cancel: jest.fn(),
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
    await scheduleMonthlyReminder(25, 'Nuevo mes', 'Revisa');
    expect(plugin.cancel).toHaveBeenCalled();
    expect(plugin.schedule).toHaveBeenLastCalledWith({
      notifications: [
        expect.objectContaining({
          title: 'Nuevo mes',
          schedule: expect.objectContaining({ on: { day: 25, hour: 9, minute: 0 } }),
        }),
      ],
    });
    await cancelMonthlyReminder();
    expect(plugin.cancel).toHaveBeenCalledTimes(2);
  });
});

describe('browser', () => {
  beforeEach(() => setNative(false));

  it('is unsupported without the Notification API', async () => {
    expect(notificationsSupported()).toBe(false);
    expect(await requestNotificationPermission()).toBe(false);
    expect(await hasNotificationPermission()).toBe(false);
    await showNotification(1, 'T', 'B');
    await scheduleMonthlyReminder(1, 'T', 'B');
    await cancelMonthlyReminder();
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
