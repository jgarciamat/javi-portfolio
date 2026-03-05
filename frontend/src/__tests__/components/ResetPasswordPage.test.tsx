import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResetPasswordPage } from '@modules/auth/ui/ResetPasswordPage';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;

jest.mock('@core/i18n/I18nContext', () => ({
    useI18n: () => ({ locale: 'es', setLocale: jest.fn(), t, tCategory: (n: string) => n }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockResetPassword = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@core/api/authApi', () => ({
    authApi: {
        resetPassword: (...args: unknown[]) => mockResetPassword(...args),
    },
}));

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

// A password that satisfies all rules
const VALID_PASS = 'NewPass1!';

function renderPage(token = 'valid-token') {
    return render(
        <MemoryRouter initialEntries={[`/reset-password?token=${token}`]}>
            <Routes>
                <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Routes>
        </MemoryRouter>
    );
}

describe('ResetPasswordPage', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders the form with password and confirm inputs', () => {
        renderPage();
        expect(screen.getByPlaceholderText(t('app.auth.reset.password'))).toBeInTheDocument();
        expect(screen.getByPlaceholderText(t('app.auth.reset.confirm'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('app.auth.reset.submit') })).toBeInTheDocument();
    });

    test('renders title and subtitle', () => {
        renderPage();
        expect(screen.getByText('Money Manager')).toBeInTheDocument();
        expect(screen.getByText(t('app.auth.reset.title'))).toBeInTheDocument();
        expect(screen.getByText(t('app.auth.reset.sub'))).toBeInTheDocument();
    });

    test('shows password strength hints when password is invalid', () => {
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: 'weak' } });
        expect(screen.getByText(/Al menos 8 caracteres/i)).toBeInTheDocument();
    });

    test('shows passwordOk message when password is valid', () => {
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        expect(screen.getByText(t('app.auth.reset.passwordOk'))).toBeInTheDocument();
    });

    test('disables submit button when password is invalid', () => {
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: 'weak' } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: 'weak' } });
        expect(screen.getByRole('button', { name: t('app.auth.reset.submit') })).toBeDisabled();
    });

    test('shows mismatch error when passwords do not match', () => {
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: 'Other1!' } });
        expect(screen.getByText(t('app.auth.reset.mismatch'))).toBeInTheDocument();
    });

    test('disables submit button when passwords do not match', () => {
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: 'Other1!' } });
        expect(screen.getByRole('button', { name: t('app.auth.reset.submit') })).toBeDisabled();
    });

    test('does not show mismatch error when confirm is empty', () => {
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        // confirm is still empty — no mismatch shown
        expect(screen.queryByText(t('app.auth.reset.mismatch'))).not.toBeInTheDocument();
    });

    test('shows inline mismatch error on submit when passwords differ', async () => {
        mockResetPassword.mockResolvedValue({ message: 'ok' });
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: 'Other1!' } });
        // Submit button is disabled, but force form submission via parent form
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.reset.submit') }).closest('form')!);
        // API should NOT be called because mismatch guard fires
        expect(mockResetPassword).not.toHaveBeenCalled();
    });

    test('calls authApi.resetPassword with the token from URL and new password', async () => {
        mockResetPassword.mockResolvedValueOnce({ message: 'done' });
        renderPage('my-token-123');
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: VALID_PASS } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.reset.submit') }).closest('form')!);
        await waitFor(() => expect(mockResetPassword).toHaveBeenCalledWith('my-token-123', VALID_PASS));
    });

    test('shows loading state while submitting', async () => {
        mockResetPassword.mockReturnValue(new Promise(() => undefined));
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: VALID_PASS } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.reset.submit') }).closest('form')!);
        await waitFor(() => expect(screen.getByRole('button', { name: t('app.auth.reset.loading') })).toBeDisabled());
    });

    test('shows success screen after successful reset', async () => {
        mockResetPassword.mockResolvedValueOnce({ message: 'done' });
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: VALID_PASS } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.reset.submit') }).closest('form')!);
        await waitFor(() => expect(screen.getByText(t('app.auth.reset.success.title'))).toBeInTheDocument());
        expect(screen.getByText(t('app.auth.reset.success.sub'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('app.auth.reset.goLogin') })).toBeInTheDocument();
    });

    test('navigates to /auth when goLogin button is clicked on success screen', async () => {
        mockResetPassword.mockResolvedValueOnce({ message: 'done' });
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: VALID_PASS } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.reset.submit') }).closest('form')!);
        await waitFor(() => screen.getByText(t('app.auth.reset.success.title')));
        fireEvent.click(screen.getByRole('button', { name: t('app.auth.reset.goLogin') }));
        expect(mockNavigate).toHaveBeenCalledWith('/auth', { replace: true });
    });

    test('shows error message when API call fails', async () => {
        mockResetPassword.mockRejectedValueOnce(new Error('El enlace ha expirado. Solicita uno nuevo.'));
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: VALID_PASS } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.reset.submit') }).closest('form')!);
        await waitFor(() => expect(screen.getByText('El enlace ha expirado. Solicita uno nuevo.')).toBeInTheDocument());
    });

    test('re-enables submit button after error', async () => {
        mockResetPassword.mockRejectedValueOnce(new Error('oops'));
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: VALID_PASS } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.reset.submit') }).closest('form')!);
        await waitFor(() => screen.getByText('oops'));
        expect(screen.getByRole('button', { name: t('app.auth.reset.submit') })).not.toBeDisabled();
    });

    test('navigates to /auth when back link is clicked on form', () => {
        renderPage();
        fireEvent.click(screen.getByText(t('app.auth.reset.goLogin')));
        expect(mockNavigate).toHaveBeenCalledWith('/auth', { replace: true });
    });

    test('toggles password visibility for new password field', () => {
        renderPage();
        const passInput = screen.getByPlaceholderText(t('app.auth.reset.password'));
        expect(passInput).toHaveAttribute('type', 'password');
        fireEvent.click(screen.getByLabelText(t('app.auth.reset.showPassword')));
        expect(passInput).toHaveAttribute('type', 'text');
        fireEvent.click(screen.getByLabelText(t('app.auth.reset.hidePassword')));
        expect(passInput).toHaveAttribute('type', 'password');
    });

    test('toggles password visibility for confirm field', () => {
        renderPage();
        const confirmInput = screen.getByPlaceholderText(t('app.auth.reset.confirm'));
        expect(confirmInput).toHaveAttribute('type', 'password');
        fireEvent.click(screen.getByLabelText(t('app.auth.reset.showConfirm')));
        expect(confirmInput).toHaveAttribute('type', 'text');
        fireEvent.click(screen.getByLabelText(t('app.auth.reset.hideConfirm')));
        expect(confirmInput).toHaveAttribute('type', 'password');
    });

    test('shows generic error message for non-Error rejection', async () => {
        mockResetPassword.mockRejectedValueOnce('boom');
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: VALID_PASS } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.reset.submit') }).closest('form')!);
        await waitFor(() => expect(screen.getByText('Error')).toBeInTheDocument());
    });

    test('handles empty token from URL gracefully', async () => {
        mockResetPassword.mockResolvedValueOnce({ message: 'done' });
        render(
            <MemoryRouter initialEntries={['/reset-password']}>
                <Routes>
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Routes>
            </MemoryRouter>
        );
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.password')), { target: { value: VALID_PASS } });
        fireEvent.change(screen.getByPlaceholderText(t('app.auth.reset.confirm')), { target: { value: VALID_PASS } });
        fireEvent.submit(screen.getByRole('button', { name: t('app.auth.reset.submit') }).closest('form')!);
        await waitFor(() => expect(mockResetPassword).toHaveBeenCalledWith('', VALID_PASS));
    });
});
