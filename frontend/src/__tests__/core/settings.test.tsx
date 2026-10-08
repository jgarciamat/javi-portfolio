import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiProvider } from '@core/context/ApiContext';
import { I18nProvider, useI18n } from '@core/i18n/I18nContext';
import {
  SettingsProvider,
  useFormat,
  useOptionalSettings,
  useSettings,
} from '@core/settings/SettingsContext';
import { AuthProvider } from '@shared/hooks/useAuth';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import { settings } from '@test-utils/fixtures';
import { signIn } from '@test-utils/render';

function setup(api: FakeApi = createFakeApi()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider>
      <AuthProvider>
        <ApiProvider value={api}>
          <SettingsProvider>{children}</SettingsProvider>
        </ApiProvider>
      </AuthProvider>
    </I18nProvider>
  );
  const hook = renderHook(() => ({ s: useSettings(), i18n: useI18n(), format: useFormat() }), {
    wrapper,
  });
  return { ...hook, api };
}

beforeEach(() => localStorage.clear());

describe('SettingsProvider', () => {
  it('loads the settings of the signed-in user and applies their language', async () => {
    signIn();
    const api = createFakeApi();
    api.settingsApi.get.mockResolvedValue(settings({ locale: 'en', currency: 'USD' }));
    const { result } = setup(api);
    await waitFor(() => expect(result.current.s.settings?.currency).toBe('USD'));
    expect(result.current.i18n.locale).toBe('en');
    expect(result.current.format.money(5)).toBe('US$5.00');
    expect(result.current.s.loading).toBe(false);
  });

  it('stays empty when signed out or the API fails', async () => {
    const { result, api } = setup();
    expect(result.current.s.settings).toBeNull();
    await act(() => result.current.s.reload());
    expect(api.settingsApi.get).not.toHaveBeenCalled();

    signIn();
    const failing = createFakeApi();
    failing.settingsApi.get.mockRejectedValue(new Error('down'));
    const second = setup(failing);
    await waitFor(() => expect(failing.settingsApi.get).toHaveBeenCalled());
    expect(second.result.current.s.settings).toBeNull();
  });

  it('updates settings and follows a language change', async () => {
    signIn();
    const api = createFakeApi();
    api.settingsApi.update.mockResolvedValue(settings({ locale: 'en' }));
    const { result } = setup(api);
    await waitFor(() => expect(result.current.s.settings).not.toBeNull());
    await act(async () => {
      await result.current.s.updateSettings({ locale: 'en' });
    });
    expect(result.current.i18n.locale).toBe('en');
  });

  it('changes the language locally and in the account', async () => {
    signIn();
    const api = createFakeApi();
    api.settingsApi.update.mockRejectedValueOnce(new Error('offline'));
    const { result } = setup(api);
    await waitFor(() => expect(result.current.s.settings).not.toBeNull());
    act(() => result.current.s.changeLocale('en'));
    expect(result.current.i18n.locale).toBe('en');
    expect(api.settingsApi.update).toHaveBeenCalledWith({ locale: 'en' });
  });

  it('changes only the device language when signed out', () => {
    const { result, api } = setup();
    act(() => result.current.s.changeLocale('en'));
    expect(result.current.i18n.locale).toBe('en');
    expect(api.settingsApi.update).not.toHaveBeenCalled();
  });

  it('throws outside the provider (optional variant returns null)', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useSettings())).toThrow('useSettings must be used inside');
    jest.restoreAllMocks();
    expect(renderHook(() => useOptionalSettings()).result.current).toBeNull();
  });
});

describe('useFormat', () => {
  it('formats with the user currency and language', async () => {
    const { result } = setup();
    const f = result.current.format;
    expect(f.currency).toBe('EUR');
    expect(f.money(1234.5)).toMatch(/^1234,50\s€$/);
    expect(f.percent(12.34)).toBe('12,3%');
    expect(f.monthName(3)).toBe('Marzo');
    expect(f.monthLabel(2026, 3)).toBe('Marzo 2026');
    expect(f.date('2026-03-04')).toBe('4 mar 2026');
    expect(f.range('2026-03-25', '2026-04-24')).toBe('25 mar – 24 abr');
  });
});
