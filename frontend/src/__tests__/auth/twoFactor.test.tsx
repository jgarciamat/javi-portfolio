import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { authApi } from '@core/api/authApi';
import { ApiError } from '@core/api/http';
import { isTwoFactorChallenge } from '@modules/auth/domain/types';
import { LoginPage } from '@modules/auth/ui/LoginPage';
import { TwoFactorSection } from '@modules/auth/ui/TwoFactorSection';
import { AuthPage } from '@shared/components/AuthPage';
import { QrCode } from '@shared/components/QrCode';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithI18n, renderWithProviders, tr } from '@test-utils/render';

const STRONG = 'Sup3r-secret!';
const CHALLENGE = {
  twoFactorRequired: true as const,
  challengeToken: 'challenge-1',
  expiresAt: '2026-03-15T12:05:00Z',
};
const SESSION = { accessToken: 'a', refreshToken: 'r', user: f.user() };

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

const codeField = () => screen.getByLabelText(tr('app.twoFactor.login.codeLabel'));
const verifyButton = () => screen.getByRole('button', { name: tr('app.twoFactor.login.submit') });

// ─── Sign-in ────────────────────────────────────────────────────────────────

describe('sign-in with two-step verification', () => {
  const renderAuthPage = () =>
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={<p>home</p>} />
      </Routes>,
      { authenticated: false, route: '/login' }
    );

  async function passwordStep() {
    fireEvent.change(screen.getByLabelText(tr('app.auth.login.emailLabel')), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.login.passwordLabel')), {
      target: { value: STRONG },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.login.submit') }));
    await screen.findByRole('heading', { name: tr('app.twoFactor.login.title') });
  }

  it('asks for the code after the password and then opens the session', async () => {
    jest.spyOn(authApi, 'login').mockResolvedValue(CHALLENGE);
    const verify = jest.spyOn(authApi, 'verifyTwoFactor').mockResolvedValue(SESSION);
    renderAuthPage();
    await passwordStep();
    const field = codeField();
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute('autocomplete', 'one-time-code');
    expect(field).toHaveAttribute('inputmode', 'numeric');
    // Only digits, at most six.
    fireEvent.change(field, { target: { value: '12a 345 67' } });
    expect(field).toHaveValue('123456');
    fireEvent.click(verifyButton());
    expect(await screen.findByText('home')).toBeInTheDocument();
    expect(verify).toHaveBeenCalledWith('challenge-1', '123456');
    expect(localStorage.getItem('mm_refresh_token')).toBe('r');
  });

  it('does not call onSuccess of the login form until the code is in', async () => {
    jest.spyOn(authApi, 'login').mockResolvedValue(CHALLENGE);
    const onSuccess = jest.fn();
    renderWithProviders(
      <LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} onSuccess={onSuccess} />,
      { authenticated: false }
    );
    fireEvent.change(screen.getByLabelText(tr('app.auth.login.emailLabel')), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.login.passwordLabel')), {
      target: { value: STRONG },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.login.submit') }));
    await waitFor(() => expect(authApi.login).toHaveBeenCalled());
    await act(async () => undefined);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(localStorage.getItem('mm_refresh_token')).toBeNull();
  });

  it('explains wrong, locked and expired codes, and other errors', async () => {
    jest.spyOn(authApi, 'login').mockResolvedValue(CHALLENGE);
    const verify = jest.spyOn(authApi, 'verifyTwoFactor');
    renderAuthPage();
    await passwordStep();
    fireEvent.change(codeField(), { target: { value: '000000' } });
    const cases: [unknown, string][] = [
      [new ApiError('x', 403, 'INVALID_TWO_FACTOR_CODE'), tr('app.twoFactor.error.invalid')],
      [new ApiError('x', 429, 'TWO_FACTOR_LOCKED'), tr('app.twoFactor.error.locked')],
      [new ApiError('x', 401, 'TWO_FACTOR_CHALLENGE_EXPIRED'), tr('app.twoFactor.error.expired')],
      [new ApiError('x', 429, 'RATE_LIMITED'), tr('app.auth.error.rateLimited')],
      [new Error('Servidor caído'), 'Servidor caído'],
      ['raro', tr('app.auth.error.generic')],
    ];
    for (const [error, message] of cases) {
      verify.mockRejectedValueOnce(error);
      fireEvent.click(verifyButton());
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(codeField()).toHaveAttribute('aria-invalid', 'true');
      expect(codeField()).toHaveAttribute('aria-describedby', 'two-factor-error');
    }
  });

  it('ignores a second submit while the code is being checked', async () => {
    jest.spyOn(authApi, 'login').mockResolvedValue(CHALLENGE);
    let resolve: (value: typeof SESSION) => void = () => undefined;
    const verify = jest
      .spyOn(authApi, 'verifyTwoFactor')
      .mockReturnValue(new Promise((r) => (resolve = r)));
    renderAuthPage();
    await passwordStep();
    fireEvent.change(codeField(), { target: { value: '123456' } });
    fireEvent.click(verifyButton());
    const busy = screen.getByRole('button', { name: tr('app.twoFactor.login.loading') });
    expect(busy).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(busy);
    expect(verify).toHaveBeenCalledTimes(1);
    await act(async () => resolve(SESSION));
    expect(await screen.findByText('home')).toBeInTheDocument();
  });

  it('takes a recovery code instead, and goes back to the password', async () => {
    jest.spyOn(authApi, 'login').mockResolvedValue(CHALLENGE);
    const verify = jest
      .spyOn(authApi, 'verifyTwoFactor')
      .mockRejectedValueOnce(new ApiError('x', 403, 'INVALID_TWO_FACTOR_CODE'));
    renderAuthPage();
    await passwordStep();
    fireEvent.click(screen.getByRole('button', { name: tr('app.twoFactor.login.useRecovery') }));
    const field = screen.getByLabelText(tr('app.twoFactor.login.recoveryLabel'));
    expect(field).toHaveFocus();
    expect(screen.getByText(tr('app.twoFactor.login.recoveryHint'))).toBeInTheDocument();
    fireEvent.change(field, { target: { value: 'ABCD-efgh-jkmn' } });
    fireEvent.click(verifyButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(tr('app.twoFactor.error.invalid'));
    expect(verify).toHaveBeenCalledWith('challenge-1', 'ABCD-efgh-jkmn');

    // Back to the app code: the field and the error start clean.
    fireEvent.click(screen.getByRole('button', { name: tr('app.twoFactor.login.useApp') }));
    expect(codeField()).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: tr('app.twoFactor.login.back') }));
    expect(screen.getByRole('heading', { name: tr('app.auth.login.title') })).toBeInTheDocument();
  });

  it('asks for the code after Google too, also from the sign-up form', async () => {
    jest.spyOn(authApi, 'googleLogin').mockResolvedValue(CHALLENGE);
    jest.spyOn(authApi, 'verifyTwoFactor').mockResolvedValue(SESSION);
    renderAuthPage();
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.login.switchLink') }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.register.google') }));
    await screen.findByRole('heading', { name: tr('app.twoFactor.login.title') });
    fireEvent.change(codeField(), { target: { value: '654321' } });
    fireEvent.click(verifyButton());
    expect(await screen.findByText('home')).toBeInTheDocument();
  });

  it('opens the session at once with Google when 2FA is off', async () => {
    jest.spyOn(authApi, 'googleLogin').mockResolvedValue(SESSION);
    const onSuccess = jest.fn();
    renderWithProviders(
      <LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} onSuccess={onSuccess} />,
      { authenticated: false }
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.login.google') }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('tells a challenge from a session', () => {
    expect(isTwoFactorChallenge(CHALLENGE)).toBe(true);
    expect(isTwoFactorChallenge(SESSION)).toBe(false);
  });
});

// ─── API ────────────────────────────────────────────────────────────────────

describe('two-factor API', () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    });
  });

  it.each([
    [
      'verifyTwoFactor',
      () => authApi.verifyTwoFactor('c', '123456'),
      '/auth/2fa/verify',
      'POST',
      { challengeToken: 'c', code: '123456' },
    ],
    ['twoFactorStatus', () => authApi.twoFactorStatus(), '/auth/2fa', 'GET', undefined],
    [
      'twoFactorSetup',
      () => authApi.twoFactorSetup({ password: 'p' }),
      '/auth/2fa/setup',
      'POST',
      { password: 'p' },
    ],
    [
      'twoFactorEnable',
      () => authApi.twoFactorEnable('123456'),
      '/auth/2fa/enable',
      'POST',
      { code: '123456' },
    ],
    [
      'twoFactorDisable',
      () => authApi.twoFactorDisable({ code: '1' }),
      '/auth/2fa/disable',
      'POST',
      { code: '1' },
    ],
    [
      'twoFactorRecoveryCodes',
      () => authApi.twoFactorRecoveryCodes({ password: 'p' }),
      '/auth/2fa/recovery-codes',
      'POST',
      { password: 'p' },
    ],
  ] as const)('%s calls %s', async (_name, call, path, method, body) => {
    await call();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://localhost:3000/api${path}`);
    expect(init.method ?? 'GET').toBe(method);
    if (body) expect(JSON.parse(init.body as string)).toEqual(body);
  });
});

// ─── Settings ───────────────────────────────────────────────────────────────

describe('TwoFactorSection', () => {
  const ENABLED = { enabled: true, enabledAt: '2026-03-01T10:00:00Z', recoveryCodesRemaining: 8 };

  const renderSection = (api = createFakeApi(), user = f.user()) =>
    renderWithProviders(<TwoFactorSection />, { api, user, finances: false });

  const button = (key: string) => screen.getByRole('button', { name: new RegExp(tr(key)) });
  const typePassword = () =>
    fireEvent.change(screen.getByLabelText(tr('app.twoFactor.identity.password')), {
      target: { value: STRONG },
    });

  it('turns on: password, QR code and key, first code and the recovery codes', async () => {
    const api = createFakeApi();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const createObjectURL = jest.fn(() => 'blob:codes');
    Object.assign(URL, { createObjectURL, revokeObjectURL: jest.fn() });
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    renderSection(api);
    expect(await screen.findByText(tr('app.twoFactor.off'))).toBeInTheDocument();

    fireEvent.click(button('app.twoFactor.enable'));
    fireEvent.change(screen.getByLabelText(tr('app.twoFactor.identity.password')), {
      target: { value: STRONG },
    });
    fireEvent.click(button('app.twoFactor.identity.continue'));
    expect(
      await screen.findByRole('img', { name: tr('app.twoFactor.scan.qrLabel') })
    ).toBeInTheDocument();
    expect(api.authApi.twoFactorSetup).toHaveBeenCalledWith({ password: STRONG });
    expect(screen.getByLabelText(tr('app.twoFactor.scan.keyLabel'))).toHaveTextContent(
      'JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP'
    );
    fireEvent.click(button('app.twoFactor.scan.copyKey'));
    expect(await screen.findByText(tr('app.twoFactor.copied'))).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');

    const field = screen.getByLabelText(tr('app.twoFactor.scan.codeLabel'));
    expect(field).toHaveAttribute('autocomplete', 'one-time-code');
    fireEvent.change(field, { target: { value: '12 34 56' } });
    api.authApi.twoFactorStatus.mockResolvedValue({ ...ENABLED, recoveryCodesRemaining: 2 });
    fireEvent.click(button('app.twoFactor.scan.activate'));
    const list = await screen.findByRole('list', { name: tr('app.twoFactor.codes.listLabel') });
    expect(api.authApi.twoFactorEnable).toHaveBeenCalledWith('123456');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent)
    ).toEqual(['aaaa-bbbb-cccc', 'dddd-eeee-ffff']);
    expect(screen.getByRole('status')).toHaveTextContent(tr('app.twoFactor.codes.ready'));

    fireEvent.click(button('app.twoFactor.codes.copy'));
    await waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith('aaaa-bbbb-cccc\ndddd-eeee-ffff')
    );
    fireEvent.click(button('app.twoFactor.codes.download'));
    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();

    fireEvent.click(button('app.twoFactor.codes.done'));
    expect(screen.getByText(tr('app.twoFactor.on', { date: '1 mar 2026' }))).toBeInTheDocument();
    // Few codes left: shown as a warning.
    expect(screen.getByText(tr('app.twoFactor.remaining', { count: 2 }))).toHaveClass('form-error');
  });

  it('keeps the button as it was when the clipboard is not available', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockRejectedValue(new Error('no')) },
    });
    const api = createFakeApi();
    renderSection(api);
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(tr('app.twoFactor.enable')) })
    );
    typePassword();
    fireEvent.click(button('app.twoFactor.identity.continue'));
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(tr('app.twoFactor.scan.copyKey')) })
    );
    await act(async () => undefined);
    expect(screen.queryByText(tr('app.twoFactor.copied'))).not.toBeInTheDocument();
  });

  it('explains a wrong password or code, and lets the user cancel', async () => {
    const api = createFakeApi();
    api.authApi.twoFactorSetup.mockRejectedValueOnce(new ApiError('x', 403, 'WRONG_PASSWORD'));
    api.authApi.twoFactorEnable
      .mockRejectedValueOnce(new ApiError('x', 403, 'INVALID_TWO_FACTOR_CODE'))
      .mockRejectedValueOnce(new ApiError('x', 400, 'TWO_FACTOR_SETUP_EXPIRED'))
      .mockRejectedValueOnce(new ApiError('Otra cosa', 400, 'SOMETHING'));
    renderSection(api);
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(tr('app.twoFactor.enable')) })
    );
    typePassword();
    fireEvent.click(button('app.twoFactor.identity.continue'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      tr('app.twoFactor.error.wrongPassword')
    );
    fireEvent.click(button('app.twoFactor.identity.continue'));
    await screen.findByRole('img', { name: tr('app.twoFactor.scan.qrLabel') });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    for (const message of [
      tr('app.twoFactor.error.invalid'),
      tr('app.twoFactor.error.setupExpired'),
      'Otra cosa',
    ]) {
      fireEvent.click(button('app.twoFactor.scan.activate'));
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
    }
    fireEvent.click(button('app.common.cancel'));
    expect(screen.getByText(tr('app.twoFactor.off'))).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ignores a second click while a request runs', async () => {
    const api = createFakeApi();
    let resolve: (value: { secret: string; otpauthUri: string }) => void = () => undefined;
    api.authApi.twoFactorSetup.mockReturnValue(new Promise((r) => (resolve = r)));
    renderSection(api);
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(tr('app.twoFactor.enable')) })
    );
    typePassword();
    const go = button('app.twoFactor.identity.continue');
    fireEvent.click(go);
    expect(go).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(go);
    expect(api.authApi.twoFactorSetup).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ secret: 'ABCD', otpauthUri: 'otpauth://totp/x?secret=ABCD' }));
    expect(
      await screen.findByRole('img', { name: tr('app.twoFactor.scan.qrLabel') })
    ).toBeInTheDocument();
  });

  it('uses the recent Google sign-in for accounts without a password', async () => {
    const api = createFakeApi();
    renderSection(api, f.user({ hasPassword: false }));
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(tr('app.twoFactor.enable')) })
    );
    expect(screen.getByText(tr('app.twoFactor.identity.google'))).toBeInTheDocument();
    fireEvent.click(button('app.twoFactor.identity.continue'));
    await screen.findByRole('img', { name: tr('app.twoFactor.scan.qrLabel') });
    expect(api.authApi.twoFactorSetup).toHaveBeenCalledWith({});
  });

  it('renews the recovery codes and turns off with the password', async () => {
    const api = createFakeApi();
    api.authApi.twoFactorStatus.mockResolvedValue(ENABLED);
    renderSection(api);
    expect(await screen.findByText(tr('app.twoFactor.remaining', { count: 8 }))).toHaveClass(
      'section-hint'
    );

    fireEvent.click(button('app.twoFactor.regenerate'));
    fireEvent.change(screen.getByLabelText(tr('app.twoFactor.identity.password')), {
      target: { value: STRONG },
    });
    fireEvent.click(button('app.twoFactor.regenerateConfirm'));
    const list = await screen.findByRole('list', { name: tr('app.twoFactor.codes.listLabel') });
    expect(within(list).getByText('gggg-hhhh-jjjj')).toBeInTheDocument();
    expect(api.authApi.twoFactorRecoveryCodes).toHaveBeenCalledWith({ password: STRONG });
    fireEvent.click(button('app.twoFactor.codes.done'));

    fireEvent.click(button('app.twoFactor.disable'));
    fireEvent.change(screen.getByLabelText(tr('app.twoFactor.identity.password')), {
      target: { value: STRONG },
    });
    api.authApi.twoFactorStatus.mockResolvedValue({
      enabled: false,
      enabledAt: null,
      recoveryCodesRemaining: 0,
    });
    fireEvent.click(button('app.twoFactor.disableConfirm'));
    expect(await screen.findByText(tr('app.twoFactor.off'))).toBeInTheDocument();
    expect(api.authApi.twoFactorDisable).toHaveBeenCalledWith({ password: STRONG });
  });

  it('asks Google-only accounts for a code to turn off, and shows lock errors', async () => {
    const api = createFakeApi();
    api.authApi.twoFactorStatus.mockResolvedValue(ENABLED);
    api.authApi.twoFactorDisable
      .mockRejectedValueOnce(new ApiError('x', 429, 'TWO_FACTOR_LOCKED'))
      .mockRejectedValueOnce(new ApiError('x', 429, 'RATE_LIMITED'))
      .mockRejectedValueOnce('raro');
    renderSection(api, f.user({ hasPassword: false }));
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(tr('app.twoFactor.disable')) })
    );
    const field = screen.getByLabelText(tr('app.twoFactor.proof.code'));
    expect(field).toHaveAttribute('inputmode', 'numeric');
    fireEvent.change(field, { target: { value: '111222' } });
    for (const message of [
      tr('app.twoFactor.error.locked'),
      tr('app.auth.error.rateLimited'),
      tr('app.twoFactor.error.generic'),
    ]) {
      fireEvent.click(button('app.twoFactor.disableConfirm'));
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
    }
    fireEvent.click(button('app.twoFactor.disableConfirm'));
    await waitFor(() => expect(api.authApi.twoFactorDisable).toHaveBeenCalledTimes(4));
    expect(api.authApi.twoFactorDisable).toHaveBeenLastCalledWith({ code: '111222' });
  });

  it('says so when the status cannot be loaded', async () => {
    const api = createFakeApi();
    api.authApi.twoFactorStatus.mockRejectedValue(new Error('Sin conexión'));
    renderSection(api);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  });
});

describe('QrCode', () => {
  it('draws the code as an SVG image once the library loads', async () => {
    renderWithI18n(<QrCode text="otpauth://totp/Finanverso:ana?secret=ABCD" label="QR" />);
    const img = await screen.findByRole('img', { name: 'QR' });
    expect(img.tagName.toLowerCase()).toBe('svg');
    // Version 3 (29 modules) plus a 4-module quiet zone on each side.
    expect(img).toHaveAttribute('viewBox', '0 0 37 37');
    expect(img.querySelector('path')!.getAttribute('d')).toMatch(/^M4 4h1v1h-1z/);
  });
});
