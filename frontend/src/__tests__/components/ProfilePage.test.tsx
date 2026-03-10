import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfilePage } from '@modules/auth/ui/ProfilePage';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;

// ── i18n mock ─────────────────────────────────────────────────────────────────
jest.mock('@core/i18n/I18nContext', () => ({
    useI18n: () => ({
        locale: 'es',
        setLocale: jest.fn(),
        t,
        tCategory: (n: string) => n,
    }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── Auth mock ─────────────────────────────────────────────────────────────────
const mockLogout = jest.fn();
const mockUpdateName = jest.fn().mockResolvedValue(undefined);
const mockUpdatePassword = jest.fn().mockResolvedValue(undefined);
const mockUpdateAvatar = jest.fn().mockResolvedValue(undefined);

jest.mock('@shared/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'u1', name: 'Test User', email: 'test@example.com', avatarUrl: null },
        logout: mockLogout,
        updateName: mockUpdateName,
        updatePassword: mockUpdatePassword,
        updateAvatar: mockUpdateAvatar,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── useDeleteAccount mock ─────────────────────────────────────────────────────
const mockHandleDelete = jest.fn();

jest.mock('@modules/auth/application/useDeleteAccount', () => ({
    useDeleteAccount: () => ({
        loading: false,
        error: null,
        handleDelete: mockHandleDelete,
    }),
}));

// ── authApi mock (needed by useProfileSections internally) ───────────────────
jest.mock('@core/api/authApi', () => ({
    authApi: {
        updateName: jest.fn().mockResolvedValue({ name: 'Test User' }),
        updatePassword: jest.fn().mockResolvedValue({ message: 'ok' }),
        updateAvatar: jest.fn().mockResolvedValue({ avatarUrl: null }),
        deleteAccount: jest.fn().mockResolvedValue(undefined),
    },
    registerUnauthorizedHandler: jest.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProfilePage', () => {
    const onClose = jest.fn();

    beforeEach(() => jest.clearAllMocks());

    // ── Rendering ─────────────────────────────────────────────────────────────

    test('renders profile panel', () => {
        render(<ProfilePage onClose={onClose} />);
        expect(screen.getByText(t('app.profile.title'))).toBeInTheDocument();
    });

    test('renders email input with user email', () => {
        render(<ProfilePage onClose={onClose} />);
        const emailInput = screen.getByDisplayValue('test@example.com');
        expect(emailInput).toBeInTheDocument();
        expect(emailInput).toBeDisabled();
    });

    test('renders delete account button', () => {
        render(<ProfilePage onClose={onClose} />);
        expect(screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        })).toBeInTheDocument();
    });

    test('delete account button has class btn-delete-account', () => {
        render(<ProfilePage onClose={onClose} />);
        const deleteBtn = screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        });
        expect(deleteBtn).toHaveClass('btn-delete-account');
    });

    // ── Modal visibility ──────────────────────────────────────────────────────

    test('DeleteAccountModal is NOT visible initially', () => {
        render(<ProfilePage onClose={onClose} />);
        expect(screen.queryByText(t('app.profile.deleteAccount.modal.title'))).not.toBeInTheDocument();
    });

    test('clicking delete account button opens the DeleteAccountModal', () => {
        render(<ProfilePage onClose={onClose} />);
        const deleteBtn = screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        });
        fireEvent.click(deleteBtn);
        expect(screen.getByText(t('app.profile.deleteAccount.modal.title'))).toBeInTheDocument();
    });

    test('clicking cancel in modal closes the modal', () => {
        render(<ProfilePage onClose={onClose} />);
        // Open modal
        fireEvent.click(screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        }));
        expect(screen.getByText(t('app.profile.deleteAccount.modal.title'))).toBeInTheDocument();

        // Click cancel
        fireEvent.click(screen.getByText(t('app.profile.deleteAccount.modal.cancel')));
        expect(screen.queryByText(t('app.profile.deleteAccount.modal.title'))).not.toBeInTheDocument();
    });

    test('modal confirm button calls handleDelete', () => {
        mockHandleDelete.mockResolvedValue(undefined);
        render(<ProfilePage onClose={onClose} />);

        // Open modal
        fireEvent.click(screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        }));

        // Click confirm
        fireEvent.click(screen.getByText(t('app.profile.deleteAccount.modal.confirm')));
        expect(mockHandleDelete).toHaveBeenCalledTimes(1);
    });

    // ── Keyboard behaviour ────────────────────────────────────────────────────

    test('Escape key calls onClose when modal is NOT open', () => {
        render(<ProfilePage onClose={onClose} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('Escape key does NOT call onClose when modal IS open', () => {
        render(<ProfilePage onClose={onClose} />);
        // Open modal
        fireEvent.click(screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        }));

        // Escape should close the modal, not the profile panel
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
    });

    test('Escape key closes modal when modal IS open', async () => {
        render(<ProfilePage onClose={onClose} />);
        // Open modal
        fireEvent.click(screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        }));
        expect(screen.getByText(t('app.profile.deleteAccount.modal.title'))).toBeInTheDocument();

        // Escape closes the modal
        fireEvent.keyDown(document, { key: 'Escape' });
        await waitFor(() => {
            expect(screen.queryByText(t('app.profile.deleteAccount.modal.title'))).not.toBeInTheDocument();
        });
    });

    // ── Overlay click ─────────────────────────────────────────────────────────

    test('clicking profile overlay (backdrop) calls onClose', () => {
        render(<ProfilePage onClose={onClose} />);
        const overlay = screen.getByRole('dialog', { name: t('app.profile.title') });
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // ── Close button ──────────────────────────────────────────────────────────

    test('close button (✕) calls onClose', () => {
        render(<ProfilePage onClose={onClose} />);
        const closeX = screen.getAllByRole('button').find(b => b.textContent === '✕');
        expect(closeX).toBeDefined();
        fireEvent.click(closeX!);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
