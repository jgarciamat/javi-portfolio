import {
  captureCreatorCode,
  clearCreatorCode,
  creatorAttribution,
  landingCreatorCode,
  setCreatorConsent,
} from '@core/creatorCode';

afterEach(() => clearCreatorCode());

describe('creator links (?aff=)', () => {
  it('keeps a valid code in memory only, never on the device', () => {
    localStorage.clear();
    sessionStorage.clear();
    captureCreatorCode('?aff=%20javi24%20&utm_source=tiktok');
    expect(landingCreatorCode()).toBe('JAVI24');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');
  });

  it('ignores missing or malformed codes', () => {
    for (const search of ['', '?ref=ABCD2345', '?aff=ab', `?aff=${'A'.repeat(21)}`, '?aff=a-b-c']) {
      captureCreatorCode(search);
      expect(landingCreatorCode()).toBeNull();
    }
  });

  it('reads the real address by default', () => {
    window.history.replaceState(null, '', '/?aff=LOLA');
    captureCreatorCode();
    expect(landingCreatorCode()).toBe('LOLA');
    window.history.replaceState(null, '', '/');
  });

  it('sends the code only after the person agrees, and forgets it after signing up', () => {
    captureCreatorCode('?aff=LOLA');
    expect(creatorAttribution()).toBeUndefined();
    setCreatorConsent(true);
    expect(creatorAttribution()).toEqual({ code: 'LOLA', consent: true });
    setCreatorConsent(false);
    expect(creatorAttribution()).toBeUndefined();
    setCreatorConsent(true);
    clearCreatorCode();
    expect(creatorAttribution()).toBeUndefined();
    expect(landingCreatorCode()).toBeNull();
  });

  it('never sends a consent without a code, and a new landing starts unticked', () => {
    setCreatorConsent(true);
    expect(creatorAttribution()).toBeUndefined();
    captureCreatorCode('?aff=LOLA');
    expect(creatorAttribution()).toBeUndefined();
  });
});
