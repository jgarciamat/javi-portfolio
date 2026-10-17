import { StrictMode, useState } from 'react';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { authApi } from '@core/api/authApi';
import { ApiError } from '@core/api/http';
import { LoginPage } from '@modules/auth/ui/LoginPage';
import { RegisterPage } from '@modules/auth/ui/RegisterPage';
import { useDashboard } from '@modules/finances/application/hooks/useDashboard';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { TransactionForm } from '@modules/finances/ui/components/TransactionForm';
import { ConfirmDeleteModal } from '@shared/components/ConfirmDeleteModal';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import { scrollBehavior } from '@shared/utils/motion';
import { mockMatchMedia } from '@test-utils/dom';
import * as f from '@test-utils/fixtures';
import { literal, renderWithI18n, renderWithProviders, tr } from '@test-utils/render';

const STRONG = 'Sup3r-secret!';

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

const publicRender = (ui: React.ReactElement) => renderWithProviders(ui, { authenticated: false });

describe('sign-in form', () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText(tr('app.auth.login.emailLabel')), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.login.passwordLabel')), {
      target: { value: STRONG },
    });
  };

  it('labels the password with its visible label', () => {
    publicRender(<LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} />);
    const password = screen.getByLabelText(tr('app.auth.login.passwordLabel'));
    expect(password).toHaveAttribute('id', 'login-password');
    expect(password).not.toHaveAttribute('aria-label');
  });

  it('after a failure focuses the e-mail, both fields described by the error', async () => {
    jest.spyOn(authApi, 'login').mockRejectedValue(new ApiError('x', 401, 'INVALID_CREDENTIALS'));
    publicRender(<LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} />);
    fill();
    const email = screen.getByLabelText(tr('app.auth.login.emailLabel'));
    const password = screen.getByLabelText(tr('app.auth.login.passwordLabel'));
    expect(email).not.toHaveAttribute('aria-invalid');
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.login.submit') }));
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(tr('app.auth.error.invalidCredentials'));
    expect(email).toHaveFocus();
    for (const field of [email, password]) {
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAttribute('aria-describedby', error.id);
    }
  });

  it('keeps the button focusable while sending and ignores a second submit', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const login = jest
      .spyOn(authApi, 'login')
      .mockReturnValue(new Promise((resolve) => (finish = resolve)) as never);
    publicRender(<LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} />);
    fill();
    const submit = screen.getByRole('button', { name: tr('app.auth.login.submit') });
    submit.focus();
    fireEvent.click(submit);
    const sending = screen.getByRole('button', { name: tr('app.auth.login.loading') });
    expect(sending).toHaveAttribute('aria-disabled', 'true');
    expect(sending).not.toBeDisabled();
    expect(sending).toHaveFocus();
    fireEvent.click(sending);
    expect(login).toHaveBeenCalledTimes(1);
    await act(async () => finish({ accessToken: 'a', refreshToken: 'r', user: f.user() }));
  });
});

describe('sign-up form', () => {
  const fill = (password: string, confirm: string) => {
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.name')), {
      target: { value: 'Ana' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.email')), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.password')), {
      target: { value: password },
    });
    fireEvent.change(screen.getByLabelText(tr('app.auth.register.confirmPassword')), {
      target: { value: confirm },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.auth.register.age') }));
  };
  const submit = () =>
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.register.submit') }));

  it('has a visible label on every field', () => {
    publicRender(<RegisterPage onSwitch={jest.fn()} />);
    for (const key of [
      'app.auth.register.name',
      'app.auth.register.email',
      'app.auth.register.password',
      'app.auth.register.confirmPassword',
    ]) {
      const field = screen.getByLabelText(tr(key));
      expect(document.querySelector(`label[for="${field.id}"]`)).toHaveTextContent(tr(key));
    }
  });

  it('points a weak password at its rules and focuses it on submit', async () => {
    publicRender(<RegisterPage onSwitch={jest.fn()} />);
    fill('abc', 'abc');
    const password = screen.getByLabelText(tr('app.auth.register.password'));
    expect(password).toHaveAttribute('aria-describedby', 'register-password-rules');
    expect(document.getElementById('register-password-rules')).toBeInTheDocument();
    submit();
    await waitFor(() => expect(password).toHaveFocus());
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-describedby', 'register-password-rules register-error');
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'register-error');
  });

  it('focuses the confirmation when it does not match', async () => {
    publicRender(<RegisterPage onSwitch={jest.fn()} />);
    fill(STRONG, `${STRONG}x`);
    const confirm = screen.getByLabelText(tr('app.auth.register.confirmPassword'));
    expect(confirm).toHaveAttribute('aria-describedby', 'register-mismatch');
    submit();
    await waitFor(() => expect(confirm).toHaveFocus());
    expect(confirm).toHaveAttribute('aria-describedby', 'register-mismatch register-error');
  });

  it('sends once while the request runs and keeps focus on the button', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const register = jest
      .spyOn(authApi, 'register')
      .mockReturnValue(new Promise((resolve) => (finish = resolve)) as never);
    publicRender(<RegisterPage onSwitch={jest.fn()} />);
    fill(STRONG, STRONG);
    const button = screen.getByRole('button', { name: tr('app.auth.register.submit') });
    button.focus();
    submit();
    const sending = await screen.findByRole('button', { name: tr('app.auth.register.loading') });
    expect(sending).toHaveAttribute('aria-disabled', 'true');
    expect(sending).toHaveFocus();
    fireEvent.click(sending);
    expect(register).toHaveBeenCalledTimes(1);
    await act(async () => finish({ message: 'ok' }));
  });
});

describe('dialog focus', () => {
  function Opener() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Borrar</button>
        {open && <ConfirmDeleteModal onConfirm={jest.fn()} onCancel={() => setOpen(false)} />}
      </>
    );
  }

  it('gives focus back to the opener even when a button inside took it with autoFocus', () => {
    renderWithI18n(<Opener />);
    const opener = screen.getByRole('button', { name: 'Borrar' });
    opener.focus();
    fireEvent.click(opener);
    const cancel = screen.getByRole('button', { name: tr('app.confirm.delete.cancel') });
    expect(cancel).toHaveFocus();
    fireEvent.click(cancel);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });
});

describe('dashboard menu and sections', () => {
  afterEach(() => {
    document.title = '';
  });

  it('is a modal: focus inside, Tab trapped, Escape back to the menu button', async () => {
    renderWithProviders(<Dashboard />);
    const burger = screen.getByRole('button', { name: tr('app.menu.open') });
    burger.focus();
    fireEvent.click(burger);
    const menu = screen.getByRole('dialog', { name: tr('app.menu.ariaLabel') });
    expect(menu).toHaveAttribute('aria-modal', 'true');
    const close = within(menu).getByRole('button', { name: tr('app.menu.close') });
    expect(close).toHaveFocus();
    const items = within(menu).getAllByRole('button');
    items[items.length - 1].focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: tr('app.menu.ariaLabel') })).toBeNull();
    expect(burger).toHaveFocus();
  });

  it('moves focus to the chosen section and names the browser tab after it', async () => {
    renderWithProviders(<Dashboard />);
    expect(document.title).toBe(`${tr('app.tabs.monthly')} · ${tr('app.header.title')}`);
    const burger = screen.getByRole('button', { name: tr('app.menu.open') });
    burger.focus();
    fireEvent.click(burger);
    const menu = screen.getByRole('dialog', { name: tr('app.menu.ariaLabel') });
    fireEvent.click(within(menu).getByRole('button', { name: literal(tr('app.tabs.budgets')) }));
    const section = screen.getByRole('region', { name: tr('app.tabs.budgets') });
    expect(section).toHaveFocus();
    expect(document.title).toBe(`${tr('app.tabs.budgets')} · ${tr('app.header.title')}`);
    await act(async () => undefined);
  });
});

describe('links to a section', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('open the section under StrictMode and leave the address clean', () => {
    window.history.replaceState(null, '', '/?tab=renta');
    const { result } = renderHook(
      () => useDashboard({ navigateTo: jest.fn(), updateTransaction: jest.fn() }),
      { wrapper: StrictMode }
    );
    expect(result.current.tab).toBe('renta');
    expect(window.location.search).toBe('');
  });
});

describe('page language', () => {
  it('follows the chosen language on <html lang>', () => {
    renderWithProviders(<LanguageSwitcher />, { authenticated: false });
    expect(document.documentElement.lang).toBe('es');
    fireEvent.click(screen.getByRole('button', { name: /Idioma/ }));
    fireEvent.click(screen.getByRole('button', { name: /English/ }));
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('new movement form', () => {
  const categories = [f.category({ id: 'c1', name: 'Alimentación' })];
  const renderForm = (availableBalance = 1000) => {
    renderWithProviders(
      <TransactionForm
        categories={categories}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
        onManageCategories={jest.fn()}
        availableBalance={availableBalance}
        defaultDate="2026-03-04"
        accounts={[]}
        quickAdd={null}
        onQuickAddDone={jest.fn()}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: literal(tr('app.transaction.form.title')) })
    );
  };
  const save = () =>
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.save') }));

  it('has visible labels and focuses the first wrong field, described by the error', async () => {
    renderForm();
    const description = screen.getByLabelText(tr('app.transaction.form.description'));
    const amount = screen.getByLabelText(tr('app.transaction.form.amount'));
    expect(screen.getByLabelText(tr('app.transaction.form.notes')).tagName).toBe('TEXTAREA');
    save();
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(tr('app.transaction.form.required'));
    expect(description).toHaveFocus();
    for (const field of [description, amount]) {
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAttribute('aria-describedby', error.id);
    }
    // Typing clears the marks.
    fireEvent.change(description, { target: { value: 'Pan' } });
    expect(description).not.toHaveAttribute('aria-invalid');
    expect(amount).not.toHaveAttribute('aria-describedby');
  });

  it('points a saving above the balance at the amount', async () => {
    renderForm(10);
    fireEvent.change(screen.getByLabelText(tr('app.transaction.form.description')), {
      target: { value: 'Hucha' },
    });
    const amount = screen.getByLabelText(tr('app.transaction.form.amount'));
    fireEvent.change(amount, { target: { value: '50' } });
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.transaction.form.type') }), {
      target: { value: 'SAVING' },
    });
    fireEvent.change(
      screen.getByRole('combobox', { name: tr('app.transaction.form.category.placeholder') }),
      { target: { value: 'Alimentación' } }
    );
    save();
    await waitFor(() => expect(amount).toHaveFocus());
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    // Cancel clears the marks too.
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.cancel') }));
  });
});

describe('scrollBehavior', () => {
  it('scrolls smoothly unless the device asks for less motion', () => {
    let restore = mockMatchMedia(true);
    expect(scrollBehavior()).toBe('auto');
    restore();
    restore = mockMatchMedia(false);
    expect(scrollBehavior()).toBe('smooth');
    restore();
  });
});
