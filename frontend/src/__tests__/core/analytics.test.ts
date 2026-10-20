import {
  landingOrigin,
  resetAnalyticsForTests,
  signupOrigin,
  track,
  TRACK_EVENTS,
} from '@core/analytics';

const native = jest.fn(() => false);
jest.mock('@shared/utils/platform', () => ({ isNativeApp: () => native() }));

const fetchMock = jest.fn();

function sent(): Record<string, unknown> {
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('http://localhost:3000/api/funnel');
  expect(init).toMatchObject({ method: 'POST', credentials: 'omit', keepalive: true });
  return JSON.parse(init.body as string);
}

function setNavigator(key: string, value: unknown): void {
  Object.defineProperty(navigator, key, { value, configurable: true });
}

function setReferrer(value: string): void {
  Object.defineProperty(document, 'referrer', { value, configurable: true });
}

beforeEach(() => {
  resetAnalyticsForTests();
  native.mockReturnValue(false);
  fetchMock.mockReset().mockResolvedValue({ ok: true, status: 204 });
  global.fetch = fetchMock;
  setNavigator('globalPrivacyControl', undefined);
  setNavigator('doNotTrack', null);
  setNavigator('webdriver', false);
  setReferrer('');
  window.history.replaceState(null, '', '/');
});

describe('track', () => {
  it('exposes the closed list of browser events', () => {
    expect(TRACK_EVENTS).toEqual([
      'visit',
      'signup_view',
      'guide_view',
      'guide_cta_click',
      'pricing_view',
      'paywall_view',
    ]);
  });

  it('sends the event, the guide and the landing origin, without cookies', () => {
    window.history.replaceState(
      null,
      '',
      '/guias/x?utm_source=TikTok&utm_campaign=renta2026&utm_content=v041'
    );
    setReferrer('https://www.google.com/search?q=renta');
    track('guide_view', { guide: 'modelo-303' });
    expect(sent()).toEqual({
      event: 'guide_view',
      guide: 'modelo-303',
      utm_source: 'TikTok',
      utm_campaign: 'renta2026',
      utm_content: 'v041',
      ref: 'www.google.com',
    });
  });

  it('keeps the first landing of the page load (first touch)', () => {
    window.history.replaceState(null, '', '/?utm_source=reddit');
    track('visit');
    window.history.replaceState(null, '', '/register?utm_source=other');
    expect(landingOrigin()).toEqual({ utm_source: 'reddit' });
  });

  it('omits empty values, our own host and unreadable referrers', () => {
    window.history.replaceState(null, '', '/?utm_source=%20%20');
    setReferrer('http://localhost/guias');
    track('visit');
    expect(sent()).toEqual({ event: 'visit' });

    resetAnalyticsForTests();
    setReferrer('not a url');
    expect(landingOrigin()).toEqual({});
  });

  it('clips long values', () => {
    window.history.replaceState(null, '', `/?utm_source=${'a'.repeat(200)}`);
    expect(landingOrigin().utm_source).toHaveLength(80);
  });

  it('marks events from the app', () => {
    native.mockReturnValue(true);
    track('paywall_view');
    expect(sent()).toEqual({ event: 'paywall_view', app: true });
  });

  it.each([
    ['globalPrivacyControl', true],
    ['doNotTrack', '1'],
    ['webdriver', true],
  ])('sends nothing when %s is %p', (key, value) => {
    setNavigator(key, value);
    track('visit');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('swallows network errors and blockers', async () => {
    fetchMock.mockRejectedValue(new TypeError('blocked'));
    expect(() => track('visit')).not.toThrow();
    await Promise.resolve();

    fetchMock.mockImplementation(() => {
      throw new Error('no fetch');
    });
    expect(() => track('signup_view')).not.toThrow();
  });
});

describe('signupOrigin', () => {
  it('is the landing origin, marked in the app, or nothing when there is none', () => {
    expect(signupOrigin()).toBeUndefined();
    resetAnalyticsForTests();
    window.history.replaceState(null, '', '/?utm_source=youtube&utm_content=v7');
    expect(signupOrigin()).toEqual({ utm_source: 'youtube', utm_content: 'v7' });
    native.mockReturnValue(true);
    expect(signupOrigin()).toEqual({ utm_source: 'youtube', utm_content: 'v7', app: true });
  });

  it('is not sent when the visitor opted out', () => {
    window.history.replaceState(null, '', '/?utm_source=youtube');
    setNavigator('globalPrivacyControl', true);
    expect(signupOrigin()).toBeUndefined();
  });
});
