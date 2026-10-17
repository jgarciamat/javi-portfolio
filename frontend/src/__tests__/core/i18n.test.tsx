/* eslint-disable @typescript-eslint/no-require-imports -- isolateModules needs require() */
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  I18nProvider,
  interpolate,
  translate,
  translateCategory,
  useI18n,
} from '@core/i18n/I18nContext';

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

describe('i18n helpers', () => {
  it('interpolates every occurrence of each variable', () => {
    expect(interpolate('{a} y {a} {b}', { a: 1, b: 'x' })).toBe('1 y 1 x');
    expect(interpolate('sin variables')).toBe('sin variables');
  });

  it('falls back to Spanish, then to the key', () => {
    expect(translate('en', 'app.common.save')).toBe('Save');
    expect(translate('en', 'no.such.key')).toBe('no.such.key');
  });

  it('translates default categories and keeps custom names', () => {
    expect(translateCategory('en', 'Ocio')).toBe('Leisure');
    expect(translateCategory('en', 'Mi categoría')).toBe('Mi categoría');
  });
});

describe('I18nProvider', () => {
  beforeEach(() => localStorage.clear());

  it('starts in Spanish and remembers the chosen language', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.locale).toBe('es');
    act(() => result.current.setLocale('en'));
    expect(result.current.t('app.common.save')).toBe('Save');
    expect(result.current.tCategory('Ocio')).toBe('Leisure');
    expect(localStorage.getItem('mm_locale')).toBe('en');
  });

  it('restores the stored language and ignores unknown values', () => {
    localStorage.setItem('mm_locale', 'en');
    expect(renderHook(() => useI18n(), { wrapper }).result.current.locale).toBe('en');
    localStorage.setItem('mm_locale', 'fr');
    expect(renderHook(() => useI18n(), { wrapper }).result.current.locale).toBe('es');
  });

  it('switches at once to a language already downloaded', () => {
    localStorage.setItem('mm_locale', 'en');
    const { result } = renderHook(() => useI18n(), { wrapper });
    act(() => result.current.setLocale('es'));
    expect(result.current.t('app.common.save')).toBe(translate('es', 'app.common.save'));
  });

  it('fails loudly outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useI18n())).toThrow('useI18n must be used inside I18nProvider');
    jest.restoreAllMocks();
  });
});

/** A fresh copy of the app's modules, where English has not been downloaded yet. */
function freshModules() {
  let mods!: {
    i18n: typeof import('@core/i18n/I18nContext');
    rtl: typeof import('@testing-library/react/pure');
  };
  jest.isolateModules(() => {
    mods = { i18n: require('@core/i18n/I18nContext'), rtl: require('@testing-library/react/pure') };
  });
  return mods;
}

describe('English on demand', () => {
  beforeEach(() => localStorage.clear());

  it('falls back to Spanish until English is downloaded', async () => {
    const { i18n } = freshModules();
    expect(i18n.isLocaleLoaded('en')).toBe(false);
    expect(i18n.translate('en', 'app.common.save')).toBe(translate('es', 'app.common.save'));
    expect(i18n.hasMessage('en', 'app.common.save')).toBe(true);
    expect(i18n.translateCategory('en', 'Ocio')).toBe('Ocio');
    await i18n.loadLocale('en');
    expect(i18n.translate('en', 'app.common.save')).toBe('Save');
    await i18n.loadLocale('es');
    expect(i18n.isLocaleLoaded('es')).toBe(true);
  });

  it('shows the splash until the stored language arrives', async () => {
    localStorage.setItem('mm_locale', 'en');
    const { i18n, rtl } = freshModules();
    const wrap = ({ children }: { children: ReactNode }) => (
      <i18n.I18nProvider>{children}</i18n.I18nProvider>
    );
    const { result } = rtl.renderHook(() => i18n.useI18n(), { wrapper: wrap });
    expect(rtl.screen.getByRole('status')).toBeInTheDocument();
    await rtl.waitFor(() => expect(result.current?.t('app.common.save')).toBe('Save'));
    rtl.cleanup();
  });

  it('downloads English when the user switches to it', async () => {
    const { i18n, rtl } = freshModules();
    const wrap = ({ children }: { children: ReactNode }) => (
      <i18n.I18nProvider>{children}</i18n.I18nProvider>
    );
    const { result } = rtl.renderHook(() => i18n.useI18n(), { wrapper: wrap });
    rtl.act(() => result.current.setLocale('en'));
    expect(result.current.locale).toBe('es');
    await rtl.waitFor(() => expect(result.current.locale).toBe('en'));
    expect(result.current.t('app.common.save')).toBe('Save');
    rtl.cleanup();
  });

  it('keeps Spanish texts when English cannot be downloaded', async () => {
    let i18n!: typeof import('@core/i18n/I18nContext');
    jest.isolateModules(() => {
      jest.doMock('@locales/en.json', () => {
        throw new Error('offline');
      });
      i18n = require('@core/i18n/I18nContext');
    });
    await i18n.loadLocale('en');
    expect(i18n.isLocaleLoaded('en')).toBe(false);
    expect(i18n.translate('en', 'app.common.save')).toBe(translate('es', 'app.common.save'));
    jest.dontMock('@locales/en.json');
  });
});
