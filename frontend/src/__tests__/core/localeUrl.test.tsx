import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider, useI18n } from '@core/i18n/I18nContext';
import { localeFromPath, localizedPath, routerBasename, withoutLocale } from '@core/i18n/localeUrl';

describe('English addresses', () => {
  it('tells the language of an address', () => {
    expect(localeFromPath('/en')).toBe('en');
    expect(localeFromPath('/en/pricing')).toBe('en');
    expect(localeFromPath('/enlaces')).toBeNull();
    expect(localeFromPath('/pricing')).toBeNull();
  });

  it('gives the router base and the address of a page in that language', () => {
    expect(routerBasename('/en/calculadora-iva')).toBe('/en');
    expect(routerBasename('/calculadora-iva')).toBeUndefined();
    expect(localizedPath('/', '/en/pricing')).toBe('/en');
    expect(localizedPath('/pricing', '/en')).toBe('/en/pricing');
    expect(localizedPath('/pricing', '/videoteca')).toBe('/pricing');
  });

  it('drops the language from an address', () => {
    expect(withoutLocale('/en')).toBe('/');
    expect(withoutLocale('/en/')).toBe('/');
    expect(withoutLocale('/en/pricing')).toBe('/pricing');
    expect(withoutLocale('/pricing')).toBe('/pricing');
  });
});

describe('I18nProvider on an English address', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
  );

  beforeEach(() => {
    localStorage.clear();
    window.history.pushState(null, '', '/en/pricing');
  });
  afterEach(() => window.history.pushState(null, '', '/'));

  it('shows English even when Spanish was chosen on this device', () => {
    localStorage.setItem('mm_locale', 'es');
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.locale).toBe('en');
  });

  it('goes to the Spanish address to switch to Spanish (the page reloads)', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    // jsdom cannot navigate: it reports it and the page stays as it was.
    const virtualConsole = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    act(() => result.current.setLocale('es'));
    expect(localStorage.getItem('mm_locale')).toBe('es');
    expect(result.current.locale).toBe('en');
    virtualConsole.mockRestore();
    act(() => result.current.setLocale('en'));
    expect(result.current.locale).toBe('en');
  });
});
