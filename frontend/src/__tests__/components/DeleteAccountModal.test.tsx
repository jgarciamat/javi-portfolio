import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteAccountModal } from '@modules/auth/ui/DeleteAccountModal';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;

jest.mock('@core/i18n/I18nContext', () => ({
    useI18n: () => ({
        locale: 'es',
        setLocale: jest.fn(),
        t,
        tCategory: (n: string) => n,
    }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('DeleteAccountModal', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    beforeEach(() => jest.clearAllMocks());

    // ── Rendering ────────────────────────────────────────────────────────────

    test('renders title', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText(t('app.profile.deleteAccount.modal.title'))).toBeInTheDocument();
    });

    test('renders warning text', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText(t('app.profile.deleteAccount.modal.warning'))).toBeInTheDocument();
    });

    test('renders body text', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText(t('app.profile.deleteAccount.modal.body'))).toBeInTheDocument();
    });

    test('renders confirm button with correct label when not loading', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText(t('app.profile.deleteAccount.modal.confirm'))).toBeInTheDocument();
    });

    test('renders cancel button with correct label', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText(t('app.profile.deleteAccount.modal.cancel'))).toBeInTheDocument();
    });

    test('has role="dialog" and aria-modal="true"', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    test('does not render error message when error is null', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        // There should be exactly 2 confirm-delete-message elements (warning + body), not 3
        const messages = document.querySelectorAll('.confirm-delete-message');
        expect(messages).toHaveLength(2);
    });

    test('renders error message when error is provided', () => {
        const errorMsg = 'Something went wrong';
        render(<DeleteAccountModal loading={false} error={errorMsg} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });

    // ── Button interactions ───────────────────────────────────────────────────

    test('calls onConfirm when confirm button is clicked', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByText(t('app.profile.deleteAccount.modal.confirm')));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
    });

    test('calls onCancel when cancel button is clicked', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByText(t('app.profile.deleteAccount.modal.cancel')));
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    // ── Keyboard ─────────────────────────────────────────────────────────────

    test('calls onCancel when Escape key is pressed', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('does not call onCancel for non-Escape keys', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.keyDown(document, { key: 'Enter' });
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(onCancel).not.toHaveBeenCalled();
    });

    // ── Overlay click ─────────────────────────────────────────────────────────

    test('calls onCancel when overlay (backdrop) is clicked', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        const overlay = screen.getByRole('dialog');
        fireEvent.click(overlay);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('does not call onCancel when clicking inside the modal card', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByText(t('app.profile.deleteAccount.modal.title')));
        expect(onCancel).not.toHaveBeenCalled();
    });

    // ── Loading state ─────────────────────────────────────────────────────────

    test('shows loading label on confirm button when loading=true', () => {
        render(<DeleteAccountModal loading={true} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText(t('app.profile.deleteAccount.deleting'))).toBeInTheDocument();
        expect(screen.queryByText(t('app.profile.deleteAccount.modal.confirm'))).not.toBeInTheDocument();
    });

    test('confirm button is disabled when loading=true', () => {
        render(<DeleteAccountModal loading={true} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        const confirmBtn = screen.getByText(t('app.profile.deleteAccount.deleting'));
        expect(confirmBtn).toBeDisabled();
    });

    test('cancel button is disabled when loading=true', () => {
        render(<DeleteAccountModal loading={true} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        const cancelBtn = screen.getByText(t('app.profile.deleteAccount.modal.cancel'));
        expect(cancelBtn).toBeDisabled();
    });

    test('confirm button has aria-busy=true when loading', () => {
        render(<DeleteAccountModal loading={true} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        const confirmBtn = screen.getByText(t('app.profile.deleteAccount.deleting'));
        expect(confirmBtn).toHaveAttribute('aria-busy', 'true');
    });

    test('confirm button has aria-busy=false when not loading', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        const confirmBtn = screen.getByText(t('app.profile.deleteAccount.modal.confirm'));
        expect(confirmBtn).toHaveAttribute('aria-busy', 'false');
    });

    test('Escape key does NOT call onCancel when loading=true', () => {
        render(<DeleteAccountModal loading={true} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCancel).not.toHaveBeenCalled();
    });

    test('overlay click does NOT call onCancel when loading=true', () => {
        render(<DeleteAccountModal loading={true} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        const overlay = screen.getByRole('dialog');
        fireEvent.click(overlay);
        expect(onCancel).not.toHaveBeenCalled();
    });

    // ── CSS classes ───────────────────────────────────────────────────────────

    test('confirm button has class btn-delete', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        const confirmBtn = screen.getByText(t('app.profile.deleteAccount.modal.confirm'));
        expect(confirmBtn).toHaveClass('btn-delete');
    });

    test('cancel button has class btn-cancel', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        const cancelBtn = screen.getByText(t('app.profile.deleteAccount.modal.cancel'));
        expect(cancelBtn).toHaveClass('btn-cancel');
    });

    test('overlay has class confirm-delete-overlay', () => {
        render(<DeleteAccountModal loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
        const overlay = screen.getByRole('dialog');
        expect(overlay).toHaveClass('confirm-delete-overlay');
    });
});
