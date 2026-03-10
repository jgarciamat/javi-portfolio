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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Helper: get an accordion header button by its controlled section id */
function getAccordionHeader(sectionId: 'avatar' | 'name' | 'password' | 'settings') {
    return document.querySelector<HTMLButtonElement>(`[aria-controls="profile-acc-${sectionId}"]`)!;
}

/** Opens the Settings accordion so the delete-account button becomes accessible */
function openSettingsAccordion() {
    fireEvent.click(getAccordionHeader('settings'));
}

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

    // ── Accordion headers visible by default ──────────────────────────────────

    test('renders all 4 accordion section headers', () => {
        render(<ProfilePage onClose={onClose} />);
        expect(getAccordionHeader('avatar')).toBeInTheDocument();
        expect(getAccordionHeader('name')).toBeInTheDocument();
        expect(getAccordionHeader('password')).toBeInTheDocument();
        expect(getAccordionHeader('settings')).toBeInTheDocument();
    });

    test('avatar section is expanded by default (aria-expanded=true)', () => {
        render(<ProfilePage onClose={onClose} />);
        expect(getAccordionHeader('avatar')).toHaveAttribute('aria-expanded', 'true');
    });

    test('name, password and settings sections are collapsed by default', () => {
        render(<ProfilePage onClose={onClose} />);
        (['name', 'password', 'settings'] as const).forEach(id => {
            expect(getAccordionHeader(id)).toHaveAttribute('aria-expanded', 'false');
        });
    });

    test('clicking an accordion header expands it (aria-expanded=true)', () => {
        render(<ProfilePage onClose={onClose} />);
        const btn = getAccordionHeader('name');
        fireEvent.click(btn);
        expect(btn).toHaveAttribute('aria-expanded', 'true');
    });

    test('clicking same accordion header again collapses it', () => {
        render(<ProfilePage onClose={onClose} />);
        const btn = getAccordionHeader('name');
        fireEvent.click(btn);
        expect(btn).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(btn);
        expect(btn).toHaveAttribute('aria-expanded', 'false');
    });

    test('opening one section closes the previously open one', () => {
        render(<ProfilePage onClose={onClose} />);
        const nameBtn = getAccordionHeader('name');
        const passwordBtn = getAccordionHeader('password');

        fireEvent.click(nameBtn);
        expect(nameBtn).toHaveAttribute('aria-expanded', 'true');

        fireEvent.click(passwordBtn);
        expect(passwordBtn).toHaveAttribute('aria-expanded', 'true');
        expect(nameBtn).toHaveAttribute('aria-expanded', 'false');
    });

    // ── Delete account (inside Settings accordion) ────────────────────────────

    test('delete account button is accessible after opening Settings', () => {
        render(<ProfilePage onClose={onClose} />);
        openSettingsAccordion();
        expect(screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        })).toBeInTheDocument();
    });

    test('delete account button has class btn-delete-account', () => {
        render(<ProfilePage onClose={onClose} />);
        openSettingsAccordion();
        const btn = screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        });
        expect(btn).toHaveClass('btn-delete-account');
    });

    // ── Modal visibility ──────────────────────────────────────────────────────

    test('DeleteAccountModal is NOT visible initially', () => {
        render(<ProfilePage onClose={onClose} />);
        expect(screen.queryByText(t('app.profile.deleteAccount.modal.title'))).not.toBeInTheDocument();
    });

    test('clicking delete account button opens the DeleteAccountModal', () => {
        render(<ProfilePage onClose={onClose} />);
        openSettingsAccordion();
        fireEvent.click(screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        }));
        expect(screen.getByText(t('app.profile.deleteAccount.modal.title'))).toBeInTheDocument();
    });

    test('clicking cancel in modal closes the modal', () => {
        render(<ProfilePage onClose={onClose} />);
        openSettingsAccordion();
        fireEvent.click(screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        }));
        expect(screen.getByText(t('app.profile.deleteAccount.modal.title'))).toBeInTheDocument();
        fireEvent.click(screen.getByText(t('app.profile.deleteAccount.modal.cancel')));
        expect(screen.queryByText(t('app.profile.deleteAccount.modal.title'))).not.toBeInTheDocument();
    });

    test('modal confirm button calls handleDelete', () => {
        mockHandleDelete.mockResolvedValue(undefined);
        render(<ProfilePage onClose={onClose} />);
        openSettingsAccordion();
        fireEvent.click(screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        }));
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
        openSettingsAccordion();
        fireEvent.click(screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
    });

    test('Escape key closes modal when modal IS open', async () => {
        render(<ProfilePage onClose={onClose} />);
        openSettingsAccordion();
        fireEvent.click(screen.getByRole('button', {
            name: new RegExp(t('app.profile.deleteAccount.button'), 'i'),
        }));
        expect(screen.getByText(t('app.profile.deleteAccount.modal.title'))).toBeInTheDocument();
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

    test('close button (x) calls onClose', () => {
        render(<ProfilePage onClose={onClose} />);
        const closeX = screen.getAllByRole('button').find(b => b.textContent === '\u2715');
        expect(closeX).toBeDefined();
        fireEvent.click(closeX!);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
