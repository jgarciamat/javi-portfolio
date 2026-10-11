import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import {
  currentSubscription,
  keyToBytes,
  pushSupported,
  subscribePush,
  unsubscribePush,
} from '@core/push/push';
import { PushSetting } from '@modules/finances/ui/components/PushSetting';
import { createFakeApi } from '@test-utils/fakeApi';
import { renderWithProviders, tr } from '@test-utils/render';

const subscription = {
  endpoint: 'https://push.test/abc',
  toJSON: () => ({ endpoint: 'https://push.test/abc', keys: { p256dh: 'p', auth: 'a' } }),
  unsubscribe: jest.fn().mockResolvedValue(true),
};
const pushManager = { getSubscription: jest.fn(), subscribe: jest.fn() };
const requestPermission = jest.fn();

/** A browser that can receive push notifications. */
function stubBrowser(permission: NotificationPermission = 'default') {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve({ pushManager }) },
    configurable: true,
  });
  (window as unknown as { PushManager: unknown }).PushManager = function PushManager() {};
  (window as unknown as { Notification: unknown }).Notification = Object.assign(
    function Notification() {},
    {
      permission,
      requestPermission,
    }
  );
}

function removeBrowserSupport() {
  Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
  delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  delete (window as unknown as Record<string, unknown>).PushManager;
  delete (window as unknown as Record<string, unknown>).Notification;
}

beforeEach(() => {
  jest.clearAllMocks();
  pushManager.getSubscription.mockResolvedValue(null);
  pushManager.subscribe.mockResolvedValue(subscription);
  requestPermission.mockResolvedValue('granted');
  subscription.unsubscribe.mockResolvedValue(true);
  stubBrowser();
});
afterEach(() => {
  jest.restoreAllMocks();
  removeBrowserSupport();
});

describe('push module', () => {
  it('is available in a browser that can receive push, but not in the Android app', () => {
    expect(pushSupported()).toBe(true);
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    expect(pushSupported()).toBe(false);
    jest.restoreAllMocks();
    removeBrowserSupport();
    expect(pushSupported()).toBe(false);
  });

  it('turns the VAPID key into bytes', () => {
    expect([...keyToBytes('AQID')]).toEqual([1, 2, 3]);
    expect([...keyToBytes('-_8')]).toEqual([251, 255]);
  });

  it('subscribes after the person allows it, reusing an existing subscription', async () => {
    expect(await subscribePush('AQID')).toEqual(subscription.toJSON());
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
    pushManager.getSubscription.mockResolvedValue(subscription);
    pushManager.subscribe.mockClear();
    expect(await subscribePush('AQID')).toEqual(subscription.toJSON());
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('does nothing when permission is refused', async () => {
    requestPermission.mockResolvedValue('denied');
    expect(await subscribePush('AQID')).toBeNull();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('cancels the subscription of this browser, if there is one', async () => {
    expect(await unsubscribePush()).toBeNull();
    pushManager.getSubscription.mockResolvedValue(subscription);
    expect(await unsubscribePush()).toBe('https://push.test/abc');
    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(await currentSubscription()).toBe(subscription);
  });
});

describe('PushSetting', () => {
  const box = () => screen.findByRole('checkbox', { name: new RegExp(tr('app.push.title')) });

  it('is hidden without browser support, without server keys, or when the server is unreachable', async () => {
    const api = createFakeApi();
    removeBrowserSupport();
    const { unmount } = renderWithProviders(<PushSetting />, { api });
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(api.pushApi.key).not.toHaveBeenCalled();
    unmount();

    stubBrowser();
    api.pushApi.key.mockResolvedValueOnce({ enabled: false, publicKey: null });
    const off = renderWithProviders(<PushSetting />, { api });
    await waitFor(() => expect(api.pushApi.key).toHaveBeenCalled());
    expect(screen.queryByRole('checkbox')).toBeNull();
    off.unmount();

    api.pushApi.key.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<PushSetting />, { api });
    await waitFor(() => expect(api.pushApi.key).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('turns the notifications on, sends a test and turns them off', async () => {
    const api = createFakeApi();
    renderWithProviders(<PushSetting />, { api });
    const toggle = await box();
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(api.pushApi.subscribe).toHaveBeenCalledWith({
        endpoint: 'https://push.test/abc',
        keys: { p256dh: 'p', auth: 'a' },
      })
    );
    await waitFor(() => expect(toggle).toBeChecked());

    fireEvent.click(screen.getByRole('button', { name: tr('app.push.test') }));
    expect(await screen.findByText(tr('app.push.sent'))).toBeInTheDocument();
    api.pushApi.test.mockResolvedValueOnce({ sent: 0 });
    fireEvent.click(screen.getByRole('button', { name: tr('app.push.test') }));
    expect(await screen.findByText(tr('app.push.notSent'))).toBeInTheDocument();
    api.pushApi.test.mockRejectedValueOnce(new Error('Servidor caído'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.push.test') }));
    expect(await screen.findByText('Servidor caído')).toBeInTheDocument();

    pushManager.getSubscription.mockResolvedValue(subscription);
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(api.pushApi.unsubscribe).toHaveBeenCalledWith('https://push.test/abc')
    );
    await waitFor(() => expect(toggle).not.toBeChecked());
  });

  it('starts on when this browser is already subscribed, and turns off without a subscription', async () => {
    stubBrowser('granted');
    pushManager.getSubscription.mockResolvedValue(subscription);
    const api = createFakeApi();
    renderWithProviders(<PushSetting />, { api });
    const toggle = await box();
    await waitFor(() => expect(toggle).toBeChecked());
    pushManager.getSubscription.mockResolvedValue(null);
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(api.pushApi.unsubscribe).not.toHaveBeenCalled();
  });

  it('explains when the browser blocks the notifications, and reports other errors', async () => {
    const api = createFakeApi();
    renderWithProviders(<PushSetting />, { api });
    const toggle = await box();
    requestPermission.mockResolvedValueOnce('denied');
    fireEvent.click(toggle);
    expect(await screen.findByText(tr('app.push.denied'))).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
    api.pushApi.subscribe.mockRejectedValueOnce('boom');
    fireEvent.click(toggle);
    expect(await screen.findByText(tr('app.push.error'))).toBeInTheDocument();
    expect(screen.queryByText(tr('app.push.denied'))).toBeNull();
  });
});
