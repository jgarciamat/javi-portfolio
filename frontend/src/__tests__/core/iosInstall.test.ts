import { Capacitor } from '@capacitor/core';
import {
  INSTALL_HINT_KEY,
  appleDevice,
  canOfferIosInstall,
  currentBrowser,
  dismissInstallHint,
  iosBrowser,
  shouldShowInstallHint,
  type BrowserInfo,
} from '@core/install/iosInstall';
import { UA, stubNavigator } from '@test-utils/browsers';

const info = (userAgent: string, extra: Partial<BrowserInfo> = {}): BrowserInfo => ({
  userAgent,
  maxTouchPoints: 5,
  standalone: false,
  ...extra,
});

const originalUA = navigator.userAgent;

afterEach(() => {
  stubNavigator(originalUA, { maxTouchPoints: 0 });
  delete (window as { matchMedia?: unknown }).matchMedia;
  localStorage.clear();
  jest.restoreAllMocks();
});

describe('which Apple device the page is on', () => {
  it('tells an iPhone, an iPad and an iPad that says it is a Mac', () => {
    expect(appleDevice(info(UA.iphoneSafari))).toBe('iphone');
    expect(appleDevice(info(UA.ipadSafari))).toBe('ipad');
    expect(appleDevice(info(UA.macSafari))).toBe('ipad');
  });

  it('is none on a Mac without a touch screen, on Android and on a computer', () => {
    expect(appleDevice(info(UA.macSafari, { maxTouchPoints: 0 }))).toBeNull();
    expect(appleDevice(info(UA.android))).toBeNull();
    expect(appleDevice(info(UA.windowsChrome))).toBeNull();
  });
});

describe('the browser the guide is for', () => {
  it('is Safari or Google Chrome on an iPhone or iPad', () => {
    expect(iosBrowser(info(UA.iphoneSafari))).toBe('safari');
    expect(iosBrowser(info(UA.ipadSafari))).toBe('safari');
    expect(iosBrowser(info(UA.macSafari))).toBe('safari');
    expect(iosBrowser(info(UA.iphoneChrome))).toBe('chrome');
  });

  it('is none for other browsers, the browsers inside other apps and other devices', () => {
    expect(iosBrowser(info(UA.iphoneFirefox))).toBeNull();
    expect(iosBrowser(info(UA.iphoneInstagram))).toBeNull();
    expect(iosBrowser(info(UA.iphoneWebView))).toBeNull();
    expect(iosBrowser(info(UA.android))).toBeNull();
    expect(iosBrowser(info(UA.windowsChrome))).toBeNull();
  });

  it('offers the install only outside the app opened from the home screen', () => {
    expect(canOfferIosInstall(info(UA.iphoneSafari))).toBe(true);
    expect(canOfferIosInstall(info(UA.iphoneChrome))).toBe(true);
    expect(canOfferIosInstall(info(UA.iphoneSafari, { standalone: true }))).toBe(false);
    expect(canOfferIosInstall(info(UA.android))).toBe(false);
  });
});

describe('the browser the page runs in', () => {
  it('reads the user agent, the touch screen and navigator.standalone', () => {
    stubNavigator(UA.iphoneSafari, { standalone: true });
    expect(currentBrowser()).toEqual({
      userAgent: UA.iphoneSafari,
      maxTouchPoints: 5,
      standalone: true,
    });
  });

  it('reads display-mode: standalone where matchMedia exists', () => {
    stubNavigator(UA.iphoneChrome);
    expect(currentBrowser().standalone).toBe(false);
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(currentBrowser().standalone).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(display-mode: standalone)');
  });
});

describe('the install notice', () => {
  it('shows on iPhone Safari and Chrome until it is dismissed on this device', () => {
    stubNavigator(UA.iphoneSafari);
    expect(shouldShowInstallHint()).toBe(true);
    expect(shouldShowInstallHint(info(UA.iphoneChrome))).toBe(true);
    dismissInstallHint();
    expect(localStorage.getItem(INSTALL_HINT_KEY)).toBe('dismissed');
    expect(shouldShowInstallHint()).toBe(false);
  });

  it('does not show inside the mobile apps, opened from the icon, on Android or on a computer', () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    expect(shouldShowInstallHint(info(UA.iphoneSafari))).toBe(false);
    jest.restoreAllMocks();
    expect(shouldShowInstallHint(info(UA.iphoneSafari, { standalone: true }))).toBe(false);
    expect(shouldShowInstallHint(info(UA.android))).toBe(false);
    expect(shouldShowInstallHint(info(UA.windowsChrome))).toBe(false);
  });

  it('still works when the storage is not available', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(shouldShowInstallHint(info(UA.iphoneSafari))).toBe(true);
    expect(() => dismissInstallHint()).not.toThrow();
  });
});
