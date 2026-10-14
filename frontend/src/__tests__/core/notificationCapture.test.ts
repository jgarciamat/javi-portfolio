const plugin = {
  status: jest.fn().mockResolvedValue({ listenerEnabled: true, enabled: true }),
  openSettings: jest.fn().mockResolvedValue(undefined),
  configure: jest.fn().mockResolvedValue(undefined),
  drain: jest.fn().mockResolvedValue({
    notifications: [{ packageName: 'p', title: 't', text: 'x', postedAt: 1 }],
  }),
};
const capacitor = { isNativePlatform: jest.fn(), getPlatform: jest.fn() };

jest.mock('@capacitor/core', () => ({
  Capacitor: capacitor,
  registerPlugin: jest.fn(() => plugin),
}));

import {
  captureStatus,
  captureSupported,
  configureCapture,
  drainCaptured,
  openCaptureSettings,
} from '@core/capture/notificationCapture';

describe('notification capture bridge', () => {
  it('only exists in the Android app', () => {
    capacitor.isNativePlatform.mockReturnValue(true);
    capacitor.getPlatform.mockReturnValue('android');
    expect(captureSupported()).toBe(true);
    capacitor.getPlatform.mockReturnValue('ios');
    expect(captureSupported()).toBe(false);
    capacitor.isNativePlatform.mockReturnValue(false);
    capacitor.getPlatform.mockReturnValue('android');
    expect(captureSupported()).toBe(false);
  });

  it('talks to the native plugin', async () => {
    expect(await captureStatus()).toEqual({ listenerEnabled: true, enabled: true });
    await openCaptureSettings();
    expect(plugin.openSettings).toHaveBeenCalled();
    await configureCapture(true, ['a', 'b']);
    expect(plugin.configure).toHaveBeenCalledWith({ enabled: true, packages: ['a', 'b'] });
    expect(await drainCaptured()).toEqual([
      { packageName: 'p', title: 't', text: 'x', postedAt: 1 },
    ]);
  });
});
