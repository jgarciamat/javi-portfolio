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
        render(<MemoryRouter><AuthPage /></MemoryRouter>);
        expect(screen.getByText(t('app.auth.login.title'))).toBeInTheDocument();
    });

    test('switches to RegisterPage when onSwitch is called', () => {
        render(<MemoryRouter><AuthPage /></MemoryRouter>);
        fireEvent.click(screen.getByText(t('app.auth.login.switchLink')));
        expect(screen.getByText(t('app.auth.register.title'))).toBeInTheDocument();
    });

    test('switches back to LoginPage from RegisterPage', () => {
        render(<MemoryRouter><AuthPage /></MemoryRouter>);
        fireEvent.click(screen.getByText(t('app.auth.login.switchLink')));
        fireEvent.click(screen.getByText(t('app.auth.register.subtitleLink')));
        expect(screen.getByText(t('app.auth.login.title'))).toBeInTheDocument();
    });

    test('switches to ForgotPasswordPage when forgot link is clicked', () => {
        render(<MemoryRouter><AuthPage /></MemoryRouter>);
        fireEvent.click(screen.getByText(t('app.auth.forgot.link')));
        expect(screen.getByText(t('app.auth.forgot.title'))).toBeInTheDocument();
    });

    test('switches back to LoginPage from ForgotPasswordPage', () => {
        render(<MemoryRouter><AuthPage /></MemoryRouter>);
        fireEvent.click(screen.getByText(t('app.auth.forgot.link')));
        expect(screen.getByText(t('app.auth.forgot.title'))).toBeInTheDocument();
        fireEvent.click(screen.getByText(t('app.auth.forgot.backToLogin')));
        expect(screen.getByText(t('app.auth.login.title'))).toBeInTheDocument();
    });

    test('navigates to / when already authenticated', () => {
        mockUseAuth.mockReturnValue({ isAuthenticated: true });
        render(<MemoryRouter><AuthPage /></MemoryRouter>);
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
});
