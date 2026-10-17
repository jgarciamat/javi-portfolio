import { Capacitor } from '@capacitor/core';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Link, Route, Routes } from 'react-router-dom';
import { authApi } from '@core/api/authApi';
import { ApiError } from '@core/api/http';
import { ForgotPasswordPage } from '@modules/auth/ui/ForgotPasswordPage';
import { LoginPage } from '@modules/auth/ui/LoginPage';
import { PrivacyPolicyPage } from '@modules/auth/ui/PrivacyPolicyPage';
import { ProfilePage } from '@modules/auth/ui/ProfilePage';
import { RegisterPage } from '@modules/auth/ui/RegisterPage';
import { ResetPasswordPage } from '@modules/auth/ui/ResetPasswordPage';
import { VerifyEmailPage } from '@modules/auth/ui/VerifyEmailPage';
import { TermsPage } from '@modules/billing/ui/TermsPage';
import { AuthPage } from '@shared/components/AuthPage';
import { emojiAvatar } from '@modules/auth/domain/avatar';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

const STRONG = 'Sup3r-secret!';

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

const publicRender = (ui: React.ReactElement, route = '/') =>
  renderWithProviders(ui, { authenticated: false, route });

// ─── Login ───────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText(tr('app.auth.login.emailLabel')), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.login.password')), {
      target: { value: STRONG },
    });
  };

  it('signs in, remembers the e-mail and calls onSuccess', async () => {
    const login = jest
      .spyOn(authApi, 'login')
      .mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: f.user() });
    const onSuccess = jest.fn();
    publicRender(<LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} onSuccess={onSuccess} />);
    fill();
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.auth.login.remember') }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.login.submit') }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(login).toHaveBeenCalledWith({ email: 'ana@example.com', password: STRONG });
    expect(localStorage.getItem('mm_remember_email')).toBe('ana@example.com');
  });

  it('prefills the remembered e-mail and forgets it when unchecked', () => {
    localStorage.setItem('mm_remember_email', 'ana@example.com');
    publicRender(<LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} />);
    expect(screen.getByLabelText(tr('app.auth.login.emailLabel'))).toHaveValue('ana@example.com');
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.auth.login.remember') }));
    expect(localStorage.getItem('mm_remember_email')).toBeNull();
  });

  it('translates known errors and shows the rest', async () => {
    const login = jest.spyOn(authApi, 'login');
    publicRender(<LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} />);
    fill();
    const submit = screen.getByRole('button', { name: tr('app.auth.login.submit') });
    login.mockRejectedValueOnce(new ApiError('x', 401, 'INVALID_CREDENTIALS'));
    fireEvent.click(submit);
    expect(await screen.findByText(tr('app.auth.error.invalidCredentials'))).toBeInTheDocument();
    login.mockRejectedValueOnce(new Error('Servidor caído'));
    fireEvent.click(submit);
    expect(await screen.findByText('Servidor caído')).toBeInTheDocument();
    login.mockRejectedValueOnce('raro');
    fireEvent.click(submit);
    expect(await screen.findByText(tr('app.auth.error.generic'))).toBeInTheDocument();
  });

  it('offers to resend the verification e-mail', async () => {
    jest.spyOn(authApi, 'login').mockRejectedValue(new ApiError('x', 403, 'EMAIL_NOT_VERIFIED'));
    const resend = jest
      .spyOn(authApi, 'resendVerification')
      .mockRejectedValue(new Error('ignored'));
    publicRender(<LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.login.submit') }));
    fireEvent.click(await screen.findByRole('button', { name: tr('app.auth.verify.resend') }));
    expect(await screen.findByText(tr('app.auth.verify.resentSub'))).toBeInTheDocument();
    expect(resend).toHaveBeenCalledWith('ana@example.com', 'es');
  });

  it('signs in with Google and reports Google errors', async () => {
    const google = jest
      .spyOn(authApi, 'googleLogin')
      .mockRejectedValueOnce(new ApiError('x', 401, 'GOOGLE_AUTH_FAILED'));
    const onSuccess = jest.fn();
    publicRender(<LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.login.google') }));
    expect(await screen.findByText(tr('app.auth.error.google'))).toBeInTheDocument();
    google.mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r', user: f.user() });
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.login.google') }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});

// ─── Register ────────────────────────────────────────────────────────────────

describe('RegisterPage', () => {
  it('registers with a strong password and shows the next step', async () => {
    const register = jest.spyOn(authApi, 'register').mockResolvedValue({ message: 'ok' });
    const onSwitch = jest.fn();
    publicRender(<RegisterPage onSwitch={onSwitch} />);
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.name')), {
      target: { value: 'Ana' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.email')), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.password')), {
      target: { value: 'abc' },
    });
    expect(screen.getByText(new RegExp(tr('app.password.rule.length')))).toBeInTheDocument();
    const form = screen
      .getByRole('button', { name: tr('app.auth.register.submit') })
      .closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent(tr('app.password.rule.upper'));
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.password')), {
      target: { value: STRONG },
    });
    expect(screen.getByText(tr('app.auth.register.passwordOk'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.confirmPassword')), {
      target: { value: 'otra' },
    });
    expect(screen.getAllByText(new RegExp(tr('app.auth.register.mismatch')))).toHaveLength(1);
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent(tr('app.auth.register.mismatch'));
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.confirmPassword')), {
      target: { value: STRONG },
    });
    fireEvent.submit(form);
    expect(await screen.findByText(tr('app.auth.register.verify.title'))).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: STRONG,
      name: 'Ana',
      locale: 'es',
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.register.verify.goLogin') }));
    expect(onSwitch).toHaveBeenCalled();
  });

  it('shows API errors and Google errors', async () => {
    jest
      .spyOn(authApi, 'register')
      .mockRejectedValueOnce(new Error('E-mail en uso'))
      .mockRejectedValueOnce('x');
    jest
      .spyOn(authApi, 'googleLogin')
      .mockRejectedValueOnce(new Error('no'))
      .mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r', user: f.user() });
    publicRender(<RegisterPage onSwitch={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.password')), {
      target: { value: STRONG },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.confirmPassword')), {
      target: { value: STRONG },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: tr('app.auth.register.submit') }).closest('form')!
    );
    expect(await screen.findByText('E-mail en uso')).toBeInTheDocument();
    fireEvent.submit(
      screen.getByRole('button', { name: tr('app.auth.register.submit') }).closest('form')!
    );
    expect(await screen.findByText(tr('app.auth.register.error'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.register.google') }));
    expect(await screen.findByText(tr('app.auth.error.google'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.register.google') }));
    await waitFor(() => expect(localStorage.getItem('mm_token')).toBe('a'));
  });
});

// ─── Password reset ──────────────────────────────────────────────────────────

describe('ForgotPasswordPage', () => {
  it('requests the e-mail and goes back', async () => {
    const request = jest
      .spyOn(authApi, 'requestPasswordReset')
      .mockResolvedValue({ message: 'ok' });
    const onBack = jest.fn();
    publicRender(<ForgotPasswordPage onBack={onBack} />);
    fireEvent.change(screen.getByLabelText(tr('app.auth.forgot.email')), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.forgot.submit') }));
    expect(await screen.findByText(tr('app.auth.forgot.success.title'))).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith('ana@example.com', 'es');
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.forgot.backToLogin') }));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows rate limits and other errors', async () => {
    jest
      .spyOn(authApi, 'requestPasswordReset')
      .mockRejectedValueOnce(new ApiError('x', 429, 'RATE_LIMITED'))
      .mockRejectedValueOnce('x');
    const onBack = jest.fn();
    publicRender(<ForgotPasswordPage onBack={onBack} />);
    const form = screen
      .getByRole('button', { name: tr('app.auth.forgot.submit') })
      .closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByText(tr('app.auth.error.rateLimited'))).toBeInTheDocument();
    fireEvent.submit(form);
    expect(await screen.findByText(tr('app.auth.error.generic'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.forgot.backToLogin') }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('ResetPasswordPage', () => {
  const renderReset = () =>
    publicRender(
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<p>login page</p>} />
      </Routes>,
      '/reset-password?token=tok'
    );

  it('sets a new password with the token of the link', async () => {
    const reset = jest.spyOn(authApi, 'resetPassword').mockResolvedValue({ message: 'ok' });
    renderReset();
    const submit = screen.getByRole('button', { name: tr('app.auth.reset.submit') });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(tr('app.auth.reset.password')), {
      target: { value: STRONG },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.reset.confirm')), {
      target: { value: 'x' },
    });
    expect(screen.getByText(tr('app.auth.reset.mismatch'))).toBeInTheDocument();
    fireEvent.submit(submit.closest('form')!);
    expect(reset).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(tr('app.auth.reset.confirm')), {
      target: { value: STRONG },
    });
    fireEvent.click(submit);
    expect(await screen.findByText(tr('app.auth.reset.success.title'))).toBeInTheDocument();
    expect(reset).toHaveBeenCalledWith('tok', STRONG);
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.reset.goLogin') }));
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('shows errors and links back to login', async () => {
    jest.spyOn(authApi, 'resetPassword').mockRejectedValue(new Error('Enlace caducado'));
    renderReset();
    fireEvent.change(screen.getByLabelText(tr('app.auth.reset.password')), {
      target: { value: STRONG },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.reset.confirm')), {
      target: { value: STRONG },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.reset.submit') }));
    expect(await screen.findByText('Enlace caducado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.reset.goLogin') }));
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('works without a token in the link', async () => {
    jest.spyOn(authApi, 'resetPassword').mockResolvedValue({ message: 'ok' });
    publicRender(<ResetPasswordPage />, '/reset-password');
    fireEvent.change(screen.getByLabelText(tr('app.auth.reset.password')), {
      target: { value: STRONG },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.reset.confirm')), {
      target: { value: STRONG },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.reset.submit') }));
    await waitFor(() => expect(authApi.resetPassword).toHaveBeenCalledWith('', STRONG));
  });
});

// ─── Verification ────────────────────────────────────────────────────────────

describe('VerifyEmailPage', () => {
  const renderVerify = (route: string) =>
    publicRender(
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/login" element={<p>login page</p>} />
      </Routes>,
      route
    );

  it('verifies the token and goes to login', async () => {
    jest.spyOn(authApi, 'verifyEmail').mockResolvedValue({ message: 'ok' });
    renderVerify('/verify-email?token=abc');
    fireEvent.click(await screen.findByRole('button', { name: tr('app.auth.login.submit') }));
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('lets the user ask for a new link when it expired', async () => {
    jest
      .spyOn(authApi, 'verifyEmail')
      .mockRejectedValue(new ApiError('Caducado', 400, 'TOKEN_EXPIRED'));
    const resend = jest
      .spyOn(authApi, 'resendVerification')
      .mockRejectedValueOnce(new Error('Demasiados intentos'))
      .mockResolvedValue({ message: 'ok' });
    renderVerify('/verify-email?token=abc');
    expect(await screen.findByText('Caducado')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(tr('app.auth.login.email')), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.verify.resend') }));
    expect(await screen.findByText('Demasiados intentos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.verify.resend') }));
    expect(await screen.findByText(tr('app.auth.verify.resent'))).toBeInTheDocument();
    expect(resend).toHaveBeenCalledWith('ana@example.com', 'es');
  });

  it('handles missing tokens and unexpected errors', async () => {
    renderVerify('/verify-email');
    expect(screen.getByText(tr('app.auth.verify.invalid'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.verify.back') }));
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('falls back to a generic message', async () => {
    jest.spyOn(authApi, 'verifyEmail').mockRejectedValue('x');
    jest.spyOn(authApi, 'resendVerification').mockRejectedValue('x');
    renderVerify('/verify-email?token=abc');
    expect(await screen.findByText(tr('app.auth.verify.invalid'))).toBeInTheDocument();
  });
});

// ─── Static pages and auth page ──────────────────────────────────────────────

describe('static pages', () => {
  /** The legal pages inside a small app, starting at `route`. */
  const legalApp = (route: string) =>
    publicRender(
      <Routes>
        <Route path="/" element={<p>inicio</p>} />
        <Route path="/pricing" element={<Link to="/terms">ver condiciones</Link>} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
      </Routes>,
      route
    );
  const back = () => fireEvent.click(screen.getByRole('button', { name: tr('app.privacy.back') }));

  it('go back to the previous screen of the app', () => {
    legalApp('/pricing');
    fireEvent.click(screen.getByRole('link', { name: 'ver condiciones' }));
    expect(screen.getByText(tr('terms.s5.title'))).toBeInTheDocument();
    back();
    expect(screen.getByRole('link', { name: 'ver condiciones' })).toBeInTheDocument();
  });

  it('go home when they were opened directly (new tab or external link)', () => {
    const { unmount } = legalApp('/terms');
    back();
    expect(screen.getByText('inicio')).toBeInTheDocument();
    unmount();
    legalApp('/privacy');
    expect(screen.getByText(tr('app.privacy.title'))).toBeInTheDocument();
    back();
    expect(screen.getByText('inicio')).toBeInTheDocument();
  });

  it('opens the register form from the pricing link', () => {
    publicRender(<AuthPage />, '/login?mode=register');
    expect(
      screen.getByRole('button', { name: tr('app.auth.register.submit') })
    ).toBeInTheDocument();
  });

  it('opens the password reset from the "you already have an account" e-mail', () => {
    publicRender(<AuthPage />, '/login?mode=forgot');
    expect(screen.getByText(tr('app.auth.forgot.title'))).toBeInTheDocument();
  });

  it('links to the prices on the web but not in the store apps', () => {
    const { unmount } = publicRender(<AuthPage />);
    expect(screen.getByRole('link', { name: tr('pricing.link') })).toBeInTheDocument();
    unmount();
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    publicRender(<AuthPage />);
    expect(screen.queryByRole('link', { name: tr('pricing.link') })).toBeNull();
    expect(screen.getByRole('link', { name: tr('app.privacy.link') })).toBeInTheDocument();
  });
});

// ─── Profile ─────────────────────────────────────────────────────────────────

describe('ProfilePage', () => {
  function setup(user = f.user(), api = createFakeApi(), plan = false) {
    const onClose = jest.fn();
    const view = renderWithProviders(<ProfilePage onClose={onClose} />, {
      api,
      finances: false,
      user,
      plan,
    });
    return { ...view, onClose };
  }
  const openDeletion = () => {
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.profile.settings.title')) })
    );
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.profile.deleteAccount.button')) })
    );
    return screen.getByRole('dialog', { name: tr('app.profile.deleteAccount.modal.title') });
  };
  const confirmButton = (dialog: HTMLElement) =>
    within(dialog).getByRole('button', { name: tr('app.profile.deleteAccount.modal.confirm') });
  const openPasswordSection = () =>
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(tr('app.profile.password.label')),
        expanded: false,
      })
    );
  const passwordForm = () => document.querySelector('form.profile-password-form')!;

  it('opens one section at a time and closes', () => {
    const { onClose } = setup();
    const avatar = screen.getByRole('button', { name: new RegExp(tr('app.profile.avatar.label')) });
    expect(avatar).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(avatar);
    expect(avatar).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.profile.name.label')) }));
    expect(screen.getByRole('textbox', { name: tr('app.profile.name.label') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.close') }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renames the user', async () => {
    const update = jest
      .spyOn(authApi, 'updateName')
      .mockResolvedValueOnce({ name: 'Ana María' })
      .mockRejectedValueOnce('x');
    setup();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.profile.name.label')) }));
    const input = screen.getByRole('textbox', { name: tr('app.profile.name.label') });
    const save = screen.getByRole('button', { name: tr('app.profile.name.save') });
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: ' Ana María ' } });
    fireEvent.click(save);
    expect(await screen.findByText(tr('app.profile.name.saved'))).toBeInTheDocument();
    expect(update).toHaveBeenCalledWith('Ana María');
    fireEvent.change(input, { target: { value: 'Otra' } });
    fireEvent.click(save);
    expect(await screen.findByText(tr('app.profile.name.error'))).toBeInTheDocument();
  });

  it('changes the password after validating it', async () => {
    const update = jest
      .spyOn(authApi, 'updatePassword')
      .mockResolvedValueOnce({ message: 'ok', accessToken: 'a2', refreshToken: 'r2' })
      .mockRejectedValueOnce(new Error('Contraseña actual incorrecta'));
    setup();
    openPasswordSection();
    const form = passwordForm();
    fireEvent.change(screen.getByLabelText(tr('app.profile.password.current')), {
      target: { value: 'old' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.profile.password.new')), {
      target: { value: 'weak' },
    });
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent(tr('app.password.rule.length'));
    fireEvent.change(screen.getByLabelText(tr('app.profile.password.new')), {
      target: { value: STRONG },
    });
    fireEvent.change(screen.getByLabelText(tr('app.profile.password.confirm')), {
      target: { value: 'otra' },
    });
    expect(screen.getByText(tr('app.profile.password.noMatch'))).toBeInTheDocument();
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent(tr('app.profile.password.mismatch'));
    fireEvent.change(screen.getByLabelText(tr('app.profile.password.confirm')), {
      target: { value: STRONG },
    });
    fireEvent.submit(form);
    expect(await screen.findByText(tr('app.profile.password.saved'))).toBeInTheDocument();
    expect(update).toHaveBeenCalledWith('old', STRONG);
    expect(screen.getByLabelText(tr('app.profile.password.new'))).toHaveValue('');
    fireEvent.change(screen.getByLabelText(tr('app.profile.password.new')), {
      target: { value: STRONG },
    });
    fireEvent.change(screen.getByLabelText(tr('app.profile.password.confirm')), {
      target: { value: STRONG },
    });
    fireEvent.submit(form);
    expect(await screen.findByText('Contraseña actual incorrecta')).toBeInTheDocument();
  });

  it('lets Google accounts set a first password', async () => {
    const update = jest
      .spyOn(authApi, 'updatePassword')
      .mockResolvedValue({ message: 'ok', accessToken: 'a2', refreshToken: 'r2' });
    setup(f.user({ hasPassword: false }));
    openPasswordSection();
    expect(screen.getByText(tr('app.profile.password.setFirst'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('app.profile.password.new')), {
      target: { value: STRONG },
    });
    fireEvent.change(screen.getByLabelText(tr('app.profile.password.confirm')), {
      target: { value: STRONG },
    });
    fireEvent.submit(passwordForm());
    await waitFor(() => expect(update).toHaveBeenCalledWith(undefined, STRONG));
  });

  it('changes the avatar with a preset or a picture', async () => {
    const update = jest
      .spyOn(authApi, 'updateAvatar')
      .mockImplementation(async (url) => ({ avatarUrl: url }));
    setup();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.profile.avatar.preset', { emoji: '🦊' }) })
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.profile.avatar.save') }));
    expect(await screen.findByText(tr('app.profile.avatar.saved'))).toBeInTheDocument();
    expect(update).toHaveBeenCalledWith(emojiAvatar('🦊'));
    expect(screen.queryByRole('button', { name: tr('app.profile.avatar.save') })).toBeNull();

    const input = screen.getByLabelText(tr('app.profile.avatar.upload'), { selector: 'input' });
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] },
    });
    expect(await screen.findByText(tr('app.profile.avatar.errorType'))).toBeInTheDocument();
    const big = new File(['x'], 'a.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 3_000_000 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByText(tr('app.profile.avatar.errorSize'))).toBeInTheDocument();
    fireEvent.change(input, {
      target: { files: [new File(['png'], 'a.png', { type: 'image/png' })] },
    });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: tr('app.profile.avatar.save') })
      ).toBeInTheDocument()
    );
    fireEvent.change(input, { target: { files: [] } });
    const click = jest
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.profile.avatar.upload')) })
    );
    expect(click).toHaveBeenCalled();
  });

  it('reports unreadable pictures and failed saves', async () => {
    jest.spyOn(authApi, 'updateAvatar').mockRejectedValue(new Error('Imagen enorme'));
    const reader = jest
      .spyOn(FileReader.prototype, 'readAsDataURL')
      .mockImplementationOnce(function (this: FileReader) {
        Object.defineProperty(this, 'error', { value: new Error('broken') });
        this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>);
      });
    setup();
    const input = screen.getByLabelText(tr('app.profile.avatar.upload'), { selector: 'input' });
    fireEvent.change(input, {
      target: { files: [new File(['png'], 'a.png', { type: 'image/png' })] },
    });
    expect(await screen.findByText(tr('app.profile.avatar.errorType'))).toBeInTheDocument();
    reader.mockRestore();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.profile.avatar.preset', { emoji: '🐼' }) })
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.profile.avatar.save') }));
    expect(await screen.findByText('Imagen enorme')).toBeInTheDocument();
  });

  it('deletes the account after confirming', async () => {
    const { api, onClose } = setup(f.user({ avatarUrl: 'data:image/png;base64,x' }));
    api.authApi.deleteAccount
      .mockRejectedValueOnce(new Error('No se pudo borrar'))
      .mockRejectedValueOnce('x');
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.profile.settings.title')) })
    );
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.profile.deleteAccount.button')) })
    );
    const dialog = screen.getByRole('dialog', {
      name: tr('app.profile.deleteAccount.modal.title'),
    });
    // Escape closes only the confirmation, not the profile.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.profile.deleteAccount.button')) })
    );
    const current = () =>
      screen.getByRole('dialog', { name: tr('app.profile.deleteAccount.modal.title') });
    const confirm = () => fireEvent.click(confirmButton(current()));
    // The current password is required before anything is sent.
    expect(confirmButton(current())).toBeDisabled();
    fireEvent.change(within(current()).getByLabelText(tr('app.profile.deleteAccount.password')), {
      target: { value: STRONG },
    });
    confirm();
    expect(api.authApi.deleteAccount).toHaveBeenCalledWith({ password: STRONG });
    expect(await screen.findByText('No se pudo borrar')).toBeInTheDocument();
    confirm();
    expect(await screen.findByText(tr('app.profile.deleteAccount.error'))).toBeInTheDocument();
    confirm();
    await waitFor(() => expect(localStorage.getItem('mm_token')).toBeNull());
    expect(dialog).toBeDefined();
    await act(async () => undefined);
  });

  it('confirms a Google-only account with Google, or directly after a recent sign-in', async () => {
    const { api } = setup(f.user({ hasPassword: false }));
    api.authApi.deleteAccount.mockRejectedValueOnce(
      new ApiError('Vuelve a iniciar sesión', 403, 'REAUTH_REQUIRED')
    );
    const dialog = openDeletion();
    expect(within(dialog).queryByLabelText(tr('app.profile.deleteAccount.password'))).toBeNull();
    expect(within(dialog).getByText(tr('app.profile.deleteAccount.google'))).toBeInTheDocument();
    fireEvent.click(confirmButton(dialog));
    expect(api.authApi.deleteAccount).toHaveBeenCalledWith({});
    expect(await within(dialog).findByText('Vuelve a iniciar sesión')).toBeInTheDocument();
    const googleMock = (await import('@react-oauth/google')) as unknown as {
      googleMock: { fail: boolean };
    };
    googleMock.googleMock.fail = true;
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.profile.deleteAccount.googleConfirm') })
    );
    expect(await within(dialog).findByText(tr('app.auth.error.google'))).toBeInTheDocument();
    googleMock.googleMock.fail = false;
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.profile.deleteAccount.googleConfirm') })
    );
    await waitFor(() =>
      expect(api.authApi.deleteAccount).toHaveBeenLastCalledWith({ googleToken: 'mock-token' })
    );
    await waitFor(() => expect(localStorage.getItem('mm_token')).toBeNull());
  });

  it('warns about an active Google Play subscription and asks to confirm it is cancelled', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(
      f.billing({
        subscription: {
          ...f.billing().subscription,
          status: 'active',
          source: 'google',
          trialEndsAt: null,
        },
      })
    );
    setup(f.user(), api, true);
    const dialog = openDeletion();
    expect(
      await within(dialog).findByText(tr('app.profile.deleteAccount.play.warning'))
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('link', { name: tr('app.profile.deleteAccount.play.link') })
    ).toHaveAttribute('href', 'https://play.google.com/store/account/subscriptions');
    fireEvent.change(within(dialog).getByLabelText(tr('app.profile.deleteAccount.password')), {
      target: { value: STRONG },
    });
    expect(confirmButton(dialog)).toBeDisabled();
    fireEvent.click(within(dialog).getByLabelText(tr('app.profile.deleteAccount.play.confirm')));
    fireEvent.click(confirmButton(dialog));
    expect(api.authApi.deleteAccount).toHaveBeenCalledWith({
      password: STRONG,
      confirmPlayCancelled: true,
    });
    await waitFor(() => expect(localStorage.getItem('mm_token')).toBeNull());
  });

  it('shows the Google Play notice when the API reports a subscription the app did not know', async () => {
    const { api } = setup(f.user({ hasPassword: false }));
    api.authApi.deleteAccount.mockRejectedValueOnce(
      new ApiError('Google Play', 409, 'PLAY_SUBSCRIPTION_ACTIVE')
    );
    const dialog = openDeletion();
    fireEvent.click(confirmButton(dialog));
    expect(
      await within(dialog).findByText(tr('app.profile.deleteAccount.play.warning'))
    ).toBeInTheDocument();
    // No duplicated error text, and Google stays hidden until the box is ticked.
    expect(within(dialog).queryByText('Google Play')).toBeNull();
    expect(
      within(dialog).queryByRole('button', { name: tr('app.profile.deleteAccount.googleConfirm') })
    ).toBeNull();
    fireEvent.click(within(dialog).getByLabelText(tr('app.profile.deleteAccount.play.confirm')));
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.profile.deleteAccount.googleConfirm') })
    );
    await waitFor(() =>
      expect(api.authApi.deleteAccount).toHaveBeenLastCalledWith({
        googleToken: 'mock-token',
        confirmPlayCancelled: true,
      })
    );
  });

  it('cancels the account deletion', () => {
    setup();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.profile.settings.title')) })
    );
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.profile.deleteAccount.button')) })
    );
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.profile.deleteAccount.modal.cancel') })
    );
    expect(
      screen.queryByRole('dialog', { name: tr('app.profile.deleteAccount.modal.title') })
    ).toBeNull();
  });
});
