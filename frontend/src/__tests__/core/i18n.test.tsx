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

  it('fails loudly outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useI18n())).toThrow('useI18n must be used inside I18nProvider');
    jest.restoreAllMocks();
  });
});
