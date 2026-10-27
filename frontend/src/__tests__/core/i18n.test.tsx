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
      jest.doMock('virtual:locale/en/core', () => {
        throw new Error('offline');
      });
      i18n = require('@core/i18n/I18nContext');
    });
    await i18n.loadLocale('en');
    expect(i18n.isLocaleLoaded('en')).toBe(false);
    expect(i18n.translate('en', 'app.common.save')).toBe(translate('es', 'app.common.save'));
    jest.dontMock('virtual:locale/en/core');
  });
});

/** The app's i18n with small texts: `core` in the main bundle, `rest` downloaded on demand. */
function splitTexts(rest: { es?: () => object; en?: () => object } = {}) {
  let mods!: {
    i18n: typeof import('@core/i18n/I18nContext');
    rtl: typeof import('@testing-library/react/pure');
  };
  const part = (messages: object) => ({ __esModule: true, default: messages });
  jest.isolateModules(() => {
    jest.doMock('virtual:locale/es/core', () => part({ 'a.core': 'núcleo' }));
    jest.doMock('virtual:locale/es/rest', () => part(rest.es?.() ?? { 'a.rest': 'resto' }));
    jest.doMock('virtual:locale/en/core', () => part({ 'a.core': 'core' }));
    jest.doMock('virtual:locale/en/rest', () => part(rest.en?.() ?? { 'a.rest': 'rest' }));
    mods = { i18n: require('@core/i18n/I18nContext'), rtl: require('@testing-library/react/pure') };
  });
  return mods;
}

describe('Texts in two parts', () => {
  beforeEach(() => {
    localStorage.clear();
    // A part imported by an earlier test would stay in the registry.
    jest.resetModules();
  });
  // The parts are imported when asked for: the mocks stay until the test ends.
  afterEach(() => {
    for (const name of ['es/core', 'es/rest', 'en/core', 'en/rest']) {
      jest.dontMock(`virtual:locale/${name}`);
    }
  });

  it('never shows a key of the rest raw: blank until it arrives, then the text', async () => {
    const { i18n, rtl } = splitTexts();
    const Probe = () => <p>[{i18n.useI18n().t('a.rest')}]</p>;
    rtl.render(
      <i18n.I18nProvider>
        <Probe />
      </i18n.I18nProvider>
    );
    expect(rtl.screen.getByText('[]')).toBeInTheDocument();
    expect(await rtl.screen.findByText('[resto]')).toBeInTheDocument();
    // Once the rest is here, a key that does not exist is shown as it is.
    expect(i18n.translate('es', 'no.such.key')).toBe('no.such.key');
    rtl.cleanup();
  });

  it('makes a page wait for every text, and a later language brings them all', async () => {
    const { i18n } = splitTexts();
    const page = i18n.withAllTexts(() => Promise.resolve('page'));
    expect(i18n.translate('es', 'a.rest')).toBe('');
    await expect(page()).resolves.toBe('page');
    expect(i18n.translate('es', 'a.rest')).toBe('resto');
    expect(i18n.isLocaleLoaded('en')).toBe(false);
    await i18n.loadLocale('en');
    expect(i18n.translate('en', 'a.rest')).toBe('rest');
  });

  it('falls back to the Spanish rest when the English one cannot arrive', async () => {
    localStorage.setItem('mm_locale', 'en');
    const { i18n, rtl } = splitTexts({
      en: () => {
        throw new Error('offline');
      },
    });
    rtl.render(<i18n.I18nProvider>{null}</i18n.I18nProvider>);
    await i18n.loadAllTexts();
    expect(i18n.translate('en', 'a.core')).toBe('core');
    expect(i18n.translate('en', 'a.rest')).toBe('resto');
    rtl.cleanup();
  });

  it('fails the page (its error screen offers to retry) when no rest can arrive', async () => {
    const offline = () => {
      throw new Error('offline');
    };
    const { i18n } = splitTexts({ es: offline, en: offline });
    await expect(i18n.withAllTexts(() => Promise.resolve('page'))()).rejects.toThrow(
      'the texts could not be downloaded'
    );
    // The blank stays (never the raw key), and nobody is told twice.
    expect(i18n.translate('es', 'a.rest')).toBe('');
  });
});
