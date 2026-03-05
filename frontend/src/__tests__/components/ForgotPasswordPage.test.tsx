import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordPage } from '@modules/auth/ui/ForgotPasswordPage';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;

jest.mock('@core/i18n/I18nContext', () => ({
    useI18n: () => ({ locale: 'es', setLocale: jest.fn(), t, tCategory: (n: string) => n }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockRequestPasswordReset = jest.fn();

// Mirror of ApiError — must be declared before mock factory but after jest.mock hoisting
// jest.mock is hoisted, so we define ApiError inside the factory using a class expression
jest.mock('@core/api/authApi', () => {
    class ApiError extends Error {
        constructor(message: string, public readonly status: number, public readonly code?: string) {
            super(message);
            this.name = 'ApiError';
        }
    }
    return {
        authApi: {
            requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
        },
        ApiError,
    };
});

// Local reference to use in tests — matches the shape of the mocked ApiError
class ApiError extends Error {
    constructor(message: string, public readonly status: number, public readonly code?: string) {
        super(message);
        this.name = 'ApiError';
    }
}

function renderPage(onBack = jest.fn()) {
    return { onBack, ...render(<MemoryRouter><ForgotPasswordPage onBack={onBack} /></MemoryRouter>) };
}

describe('ForgotPasswordPage', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders the form with email input and submit button', () => {
        renderPage();
        expect(screen.getByPlaceholderText(t('app.auth.forgot.email'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('app.auth.forgot.submit') })).toBeInTheDocument();
        expect(screen.getByText(t('app.auth.forgot.backToLogin'))).toBeInTheDocument();
    });

    test('renders the title and subtitle', () => {
        renderPage();
        expect(screen.getByText('Money Manager')).toBeInTheDocument();
        expect(screen.getByText(t('app.auth.forgot.title'))).toBeInTheDocument();
        expect(screen.getByText(t('app.auth.forgot.sub'))).toBeInTheDocument();
    });

    test('updates email input on change', () => {
        renderPage();
        const input = screen.getByPlaceholderText(t('app.auth.forgot.email')) as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'user@test.com' } });
        expect(input.value).toBe('user@test.com');
    });

    test('shows loading state while submitting', async () => {
        mockRequestPasswordReset.mockReturnValue(new Promise(() => undefined)); // never resolves
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.forgot.email')), { target: { value: 'a@b.com' } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.forgot.submit') }).closest('form')!);
        await waitFor(() => expect(screen.getByRole('button', { name: t('app.auth.forgot.loading') })).toBeDisabled());
    });

    test('calls authApi.requestPasswordReset with the entered email', async () => {
        mockRequestPasswordReset.mockResolvedValueOnce({ message: 'ok' });
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.forgot.email')), { target: { value: 'user@test.com' } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.forgot.submit') }).closest('form')!);
        await waitFor(() => expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@test.com'));
    });

    test('shows success state after successful submission', async () => {
        mockRequestPasswordReset.mockResolvedValueOnce({ message: 'ok' });
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.forgot.email')), { target: { value: 'user@test.com' } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.forgot.submit') }).closest('form')!);

        await waitFor(() => expect(screen.getByText(t('app.auth.forgot.success.title'))).toBeInTheDocument());
        expect(screen.getByText(t('app.auth.forgot.success.sub'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('app.auth.forgot.backToLogin') })).toBeInTheDocument();
    });

    test('calls onBack when back link in success state is clicked', async () => {
        mockRequestPasswordReset.mockResolvedValueOnce({ message: 'ok' });
        const { onBack } = renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.forgot.email')), { target: { value: 'a@b.com' } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.forgot.submit') }).closest('form')!);
        await waitFor(() => screen.getByText(t('app.auth.forgot.success.title')));
        fireEvent.click(screen.getByRole('button', { name: t('app.auth.forgot.backToLogin') }));
        expect(onBack).toHaveBeenCalled();
    });

    test('calls onBack when back link in form is clicked', () => {
        const { onBack } = renderPage();
        fireEvent.click(screen.getByText(t('app.auth.forgot.backToLogin')));
        expect(onBack).toHaveBeenCalled();
    });

    test('shows error message when API call fails', async () => {
        mockRequestPasswordReset.mockRejectedValueOnce(new Error('Server error'));
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.forgot.email')), { target: { value: 'a@b.com' } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.forgot.submit') }).closest('form')!);
        await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
    });

    test('shows generic error for non-Error rejection', async () => {
        mockRequestPasswordReset.mockRejectedValueOnce('boom');
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.forgot.email')), { target: { value: 'a@b.com' } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.forgot.submit') }).closest('form')!);
        await waitFor(() => expect(screen.getByText('Error')).toBeInTheDocument());
    });

    test('re-enables submit button after error', async () => {
        mockRequestPasswordReset.mockRejectedValueOnce(new Error('oops'));
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.forgot.email')), { target: { value: 'a@b.com' } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.forgot.submit') }).closest('form')!);
        await waitFor(() => screen.getByText('oops'));
        expect(screen.getByRole('button', { name: t('app.auth.forgot.submit') })).not.toBeDisabled();
    });

    test('shows "email not registered" error when API returns 404', async () => {
        mockRequestPasswordReset.mockRejectedValueOnce(new ApiError('El email no está registrado.', 404, 'EMAIL_NOT_FOUND'));
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.forgot.email')), { target: { value: 'nobody@test.com' } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.forgot.submit') }).closest('form')!);
        await waitFor(() => expect(screen.getByText(t('app.auth.forgot.error.notFound'))).toBeInTheDocument());
    });

    test('shows "already sent" error and disables button when API returns 409', async () => {
        mockRequestPasswordReset.mockRejectedValueOnce(new ApiError('Ya se ha enviado.', 409, 'RESET_EMAIL_ALREADY_SENT'));
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.forgot.email')), { target: { value: 'a@b.com' } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.forgot.submit') }).closest('form')!);
        await waitFor(() => expect(screen.getByText(t('app.auth.forgot.error.alreadySent'))).toBeInTheDocument());
        expect(screen.getByRole('button', { name: t('app.auth.forgot.submit') })).toBeDisabled();
    });
});
