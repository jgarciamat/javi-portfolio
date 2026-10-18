import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthPage } from '@shared/components/AuthPage';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;

jest.mock('@core/i18n/I18nContext', () => ({
  useI18n: () => ({ locale: 'es', setLocale: jest.fn(), t, tCategory: (n: string) => n }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@shared/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@core/api/authApi', () => ({
  authApi: {
    requestPasswordReset: jest.fn().mockResolvedValue({ message: 'ok' }),
  },
}));

import { useAuth } from '@shared/hooks/useAuth';
const mockUseAuth = useAuth as jest.Mock;

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
  });

  test('renders LoginPage by default', () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    expect(screen.getByText(t('app.auth.login.title'))).toBeInTheDocument();
  });

  test('switches to RegisterPage when onSwitch is called', () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(t('app.auth.login.switchLink')));
    expect(screen.getByText(t('app.auth.register.title'))).toBeInTheDocument();
  });

  test('switches back to LoginPage from RegisterPage', () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(t('app.auth.login.switchLink')));
    fireEvent.click(screen.getByText(t('app.auth.register.subtitleLink')));
    expect(screen.getByText(t('app.auth.login.title'))).toBeInTheDocument();
  });

  test('switches to ForgotPasswordPage when forgot link is clicked', () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(t('app.auth.forgot.link')));
    expect(screen.getByText(t('app.auth.forgot.title'))).toBeInTheDocument();
  });

  test('switches back to LoginPage from ForgotPasswordPage', () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(t('app.auth.forgot.link')));
    expect(screen.getByText(t('app.auth.forgot.title'))).toBeInTheDocument();
    fireEvent.click(screen.getByText(t('app.auth.forgot.backToLogin')));
    expect(screen.getByText(t('app.auth.login.title'))).toBeInTheDocument();
  });

  test('navigates to / when already authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  test('goes to the section of the app the visitor came for', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    render(
      <MemoryRouter initialEntries={['/login?next=%2F%3Ftab%3Drenta']}>
        <AuthPage />
      </MemoryRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/?tab=renta', { replace: true });
  });

  test('ignores a next address that does not point to the app', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    render(
      <MemoryRouter initialEntries={['/login?next=https%3A%2F%2Fevil.example']}>
        <AuthPage />
      </MemoryRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  test('goes back to the guide or calculator the visitor left to sign in', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    render(
      <MemoryRouter initialEntries={['/login?next=%2Fguias%2Fmetodo-50-30-20']}>
        <AuthPage />
      </MemoryRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/guias/metodo-50-30-20', { replace: true });
    expect(localStorage.getItem('mm_next')).toBeNull();
  });

  test('remembers it across the verification e-mail, which opens a tab without `next`', () => {
    localStorage.clear();
    const signUp = render(
      <MemoryRouter initialEntries={['/login?mode=register&next=%2Fcalculadora-sueldo-neto']}>
        <AuthPage />
      </MemoryRouter>
    );
    expect(screen.getByText(t('app.auth.register.title'))).toBeInTheDocument();
    signUp.unmount();
    // Later, in the tab of the e-mail link: /verify-email → /login, signed in there.
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthPage />
      </MemoryRouter>
    );
    expect(mockNavigate).toHaveBeenCalledWith('/calculadora-sueldo-neto', { replace: true });
    expect(localStorage.getItem('mm_next')).toBeNull();
  });
});
