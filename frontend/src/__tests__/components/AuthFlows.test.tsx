import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import esJson from '@locales/es.json';
import { LoginPage } from '@modules/auth/ui/LoginPage';
import { VerifyEmailPage } from '@modules/auth/ui/VerifyEmailPage';
import { SettingsProvider, useFormat, useSettings } from '@core/settings/SettingsContext';
import { ApiError } from '@core/api/http';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;
const mockSetLocale = jest.fn();

jest.mock('@core/i18n/I18nContext', () => ({
  useI18n: () => ({ locale: 'es', setLocale: mockSetLocale, t, tCategory: (n: string) => n }),
}));

const mockLogin = jest.fn();
const mockLoginWithGoogle = jest.fn();
let mockAuthenticated = false;
jest.mock('@shared/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    isAuthenticated: mockAuthenticated,
  }),
}));

const mockResend = jest.fn().mockResolvedValue({ message: 'ok' });
const mockVerify = jest.fn();
jest.mock('@core/api/authApi', () => ({
  authApi: {
    resendVerification: (...a: unknown[]) => mockResend(...a),
    verifyEmail: (...a: unknown[]) => mockVerify(...a),
  },
}));

const settingsGet = jest.fn();
const settingsUpdate = jest.fn();
jest.mock('@core/context/ApiContext', () => ({
  useApi: () => ({ settingsApi: { get: settingsGet, update: settingsUpdate } }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticated = false;
});

describe('LoginPage', () => {
  const submit = () => {
    fireEvent.change(screen.getByPlaceholderText(t('app.auth.login.email')), {
      target: { value: 'a@b.co' },
    });
    fireEvent.change(screen.getByPlaceholderText(t('app.auth.login.password')), {
      target: { value: 'pw' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Iniciar sesión/i }).closest('form')!);
  };

  test('offers to resend the verification e-mail when the account is not verified', async () => {
    mockLogin.mockRejectedValueOnce(new ApiError('x', 403, 'EMAIL_NOT_VERIFIED'));
    render(
      <MemoryRouter>
        <LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} />
      </MemoryRouter>
    );
    submit();
    expect(await screen.findByText(t('app.auth.error.emailNotVerified'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('app.auth.verify.resend') }));
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith('a@b.co', 'es'));
    expect(await screen.findByText(t('app.auth.verify.resentSub'))).toBeInTheDocument();
  });

  test('translates wrong credentials and rate limiting', async () => {
    mockLogin.mockRejectedValueOnce(new ApiError('x', 401, 'INVALID_CREDENTIALS'));
    render(
      <MemoryRouter>
        <LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} />
      </MemoryRouter>
    );
    submit();
    expect(await screen.findByText(t('app.auth.error.invalidCredentials'))).toBeInTheDocument();
    mockLogin.mockRejectedValueOnce(new ApiError('x', 429, 'RATE_LIMITED'));
    submit();
    expect(await screen.findByText(t('app.auth.error.rateLimited'))).toBeInTheDocument();
  });

  test('Google errors are shown instead of being ignored (old bug)', async () => {
    mockLoginWithGoogle.mockRejectedValueOnce(new ApiError('x', 401, 'GOOGLE_AUTH_FAILED'));
    render(
      <MemoryRouter>
        <LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.auth.login.google')) }));
    expect(await screen.findByText(t('app.auth.error.google'))).toBeInTheDocument();
    expect(mockLoginWithGoogle).toHaveBeenCalledWith('mock-token', 'es');
  });
});

describe('VerifyEmailPage', () => {
  const renderAt = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <VerifyEmailPage />
      </MemoryRouter>
    );

  test('verifies the token once', async () => {
    mockVerify.mockResolvedValueOnce({ message: 'ok' });
    renderAt('/verify-email?token=abc');
    expect(await screen.findByText(t('app.auth.verify.success'))).toBeInTheDocument();
    expect(mockVerify).toHaveBeenCalledTimes(1);
  });

  test('an expired link lets the user request a new one', async () => {
    mockVerify.mockRejectedValueOnce(new ApiError('El enlace ha caducado', 400, 'TOKEN_EXPIRED'));
    renderAt('/verify-email?token=old');
    expect(await screen.findByText('El enlace ha caducado')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(t('app.auth.login.email')), {
      target: { value: 'a@b.co' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('app.auth.verify.resend') }));
    expect(await screen.findByText(t('app.auth.verify.resent'))).toBeInTheDocument();
  });

  test('without token it shows an error without calling the API', () => {
    renderAt('/verify-email');
    expect(screen.getByText(t('app.auth.verify.invalid'))).toBeInTheDocument();
    expect(mockVerify).not.toHaveBeenCalled();
  });
});

describe('SettingsProvider', () => {
  const settings = {
    currency: 'USD',
    locale: 'en',
    monthStartDay: 25,
    defaultAccountId: 'a1',
    notificationsEnabled: false,
    currentPeriod: { year: 2026, month: 4, start: '2026-03-25', end: '2026-04-24' },
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SettingsProvider>{children}</SettingsProvider>
  );

  test('loads the settings when signed in, applies the language and formats in the user currency', async () => {
    mockAuthenticated = true;
    settingsGet.mockResolvedValue(settings);
    const { result } = renderHook(() => ({ s: useSettings(), f: useFormat() }), { wrapper });
    await waitFor(() => expect(result.current.s.settings).toEqual(settings));
    expect(mockSetLocale).toHaveBeenCalledWith('en');
    expect(result.current.f.currency).toBe('USD');
    expect(result.current.f.money(5)).toMatch(/US\$|\$/);
  });

  test('changing the language is saved in the account', async () => {
    mockAuthenticated = true;
    settingsGet.mockResolvedValue({ ...settings, locale: 'es' });
    settingsUpdate.mockResolvedValue({ ...settings, locale: 'en' });
    const { result } = renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(result.current.settings).not.toBeNull());
    act(() => result.current.changeLocale('en'));
    expect(mockSetLocale).toHaveBeenCalledWith('en');
    await waitFor(() => expect(settingsUpdate).toHaveBeenCalledWith({ locale: 'en' }));
  });

  test('does not call the API when signed out', () => {
    renderHook(() => useSettings(), { wrapper });
    expect(settingsGet).not.toHaveBeenCalled();
  });
});
