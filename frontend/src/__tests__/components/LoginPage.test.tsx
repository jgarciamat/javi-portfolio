import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '@modules/auth/ui/LoginPage';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;

jest.mock('@core/i18n/I18nContext', () => ({
  useI18n: () => ({ locale: 'es', setLocale: jest.fn(), t, tCategory: (n: string) => n }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockLogin = jest.fn().mockResolvedValue(undefined);
const mockLoginWithGoogle = jest.fn().mockResolvedValue(undefined);

jest.mock('@shared/hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin, loginWithGoogle: mockLoginWithGoogle }),
}));

describe('LoginPage', () => {
  const mockOnSwitch = jest.fn();
  const mockOnForgot = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  test('links to our social profiles in a new tab', () => {
    render(
      <MemoryRouter>
        <LoginPage onSwitch={mockOnSwitch} onForgot={mockOnForgot} />
      </MemoryRouter>
    );
    const socials = screen.getByRole('navigation', { name: 'Síguenos en' });
    for (const [network, url] of [
      ['Instagram', 'https://www.instagram.com/finanverso.app/'],
      ['TikTok', 'https://www.tiktok.com/@money.manager00'],
      ['YouTube', 'https://www.youtube.com/@finanversoapp'],
    ]) {
      const link = within(socials).getByRole('link', { name: `Síguenos en ${network}` });
      expect(link).toHaveAttribute('href', url);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveTextContent(network);
    }
  });

  test('renders email, password inputs and submit button', () => {
    render(
      <MemoryRouter>
        <LoginPage onSwitch={mockOnSwitch} onForgot={mockOnForgot} />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText(t('app.auth.login.email'))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(t('app.auth.login.password'))).toBeInTheDocument();
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
  });

  test('renders forgot password link', () => {
    render(
      <MemoryRouter>
        <LoginPage onSwitch={mockOnSwitch} onForgot={mockOnForgot} />
      </MemoryRouter>
    );
    expect(screen.getByText(t('app.auth.forgot.link'))).toBeInTheDocument();
  });

  test('calls onForgot when forgot password link is clicked', () => {
    render(
      <MemoryRouter>
        <LoginPage onSwitch={mockOnSwitch} onForgot={mockOnForgot} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(t('app.auth.forgot.link')));
    expect(mockOnForgot).toHaveBeenCalled();
  });

  test('calls login with email and password on submit', async () => {
    render(
      <MemoryRouter>
        <LoginPage onSwitch={mockOnSwitch} onForgot={mockOnForgot} />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(t('app.auth.login.email')), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(t('app.auth.login.password')), {
      target: { value: 'pass123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Iniciar sesión/i }).closest('form')!);
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'pass123'));
  });

  test('shows error message when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciales inválidas'));
    render(
      <MemoryRouter>
        <LoginPage onSwitch={mockOnSwitch} onForgot={mockOnForgot} />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(t('app.auth.login.email')), {
      target: { value: 'bad@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(t('app.auth.login.password')), {
      target: { value: 'wrong' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Iniciar sesión/i }).closest('form')!);
    await waitFor(() => expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument());
  });

  test('shows generic error for non-Error rejection', async () => {
    mockLogin.mockRejectedValueOnce('boom');
    render(
      <MemoryRouter>
        <LoginPage onSwitch={mockOnSwitch} onForgot={mockOnForgot} />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(t('app.auth.login.email')), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(t('app.auth.login.password')), {
      target: { value: 'pw' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Iniciar sesión/i }).closest('form')!);
    await waitFor(() => expect(screen.getByText(t('app.auth.error.generic'))).toBeInTheDocument());
  });

  test('toggles password visibility', () => {
    render(
      <MemoryRouter>
        <LoginPage onSwitch={mockOnSwitch} onForgot={mockOnForgot} />
      </MemoryRouter>
    );
    const passInput = screen.getByPlaceholderText(t('app.auth.login.password'));
    expect(passInput).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByLabelText('Mostrar contraseña'));
    expect(passInput).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByLabelText('Ocultar contraseña'));
    expect(passInput).toHaveAttribute('type', 'password');
  });

  test('calls onSwitch when register link is clicked', () => {
    render(
      <MemoryRouter>
        <LoginPage onSwitch={mockOnSwitch} onForgot={mockOnForgot} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(t('app.auth.login.switchLink')));
    expect(mockOnSwitch).toHaveBeenCalled();
  });
});
