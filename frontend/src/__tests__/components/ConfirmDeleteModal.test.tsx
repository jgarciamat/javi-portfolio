import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDeleteModal } from '@shared/components/ConfirmDeleteModal';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;

jest.mock('@core/i18n/I18nContext', () => ({
    useI18n: () => ({
        locale: 'es', setLocale: jest.fn(),
        t,
        tCategory: (n: string) => n,
    }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ConfirmDeleteModal', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    beforeEach(() => jest.clearAllMocks());

    test('renders title, message and both buttons', () => {
        render(<ConfirmDeleteModal onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(t('app.confirm.delete.title'))).toBeInTheDocument();
        expect(screen.getByText(t('app.confirm.delete.message'))).toBeInTheDocument();
        expect(screen.getByText(t('app.confirm.delete.cancel'))).toBeInTheDocument();
        expect(screen.getByText(t('app.confirm.delete.confirm'))).toBeInTheDocument();
    });

    test('calls onConfirm when the confirm button is clicked', () => {
        render(<ConfirmDeleteModal onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByText(t('app.confirm.delete.confirm')));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
    });

    test('calls onCancel when the cancel button is clicked', () => {
        render(<ConfirmDeleteModal onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByText(t('app.confirm.delete.cancel')));
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    test('calls onCancel when Escape key is pressed', () => {
        render(<ConfirmDeleteModal onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    test('does not call onCancel for non-Escape keys', () => {
        render(<ConfirmDeleteModal onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.keyDown(document, { key: 'Enter' });
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(onCancel).not.toHaveBeenCalled();
    });

    test('calls onCancel when overlay is clicked', () => {
        render(<ConfirmDeleteModal onConfirm={onConfirm} onCancel={onCancel} />);
        const overlay = screen.getByRole('dialog');
        fireEvent.click(overlay);
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    test('does not call onCancel when clicking inside the modal card', () => {
        render(<ConfirmDeleteModal onConfirm={onConfirm} onCancel={onCancel} />);
        // Click the title element (inside the card, not the overlay itself)
        fireEvent.click(screen.getByText(t('app.confirm.delete.title')));
        expect(onCancel).not.toHaveBeenCalled();
    });

    test('confirm button has class btn-danger', () => {
        render(<ConfirmDeleteModal onConfirm={onConfirm} onCancel={onCancel} />);
        const confirmBtn = screen.getByText(t('app.confirm.delete.confirm'));
        expect(confirmBtn).toHaveClass('btn-danger');
    });

    test('cancel button has class btn-cancel', () => {
        render(<ConfirmDeleteModal onConfirm={onConfirm} onCancel={onCancel} />);
        const cancelBtn = screen.getByText(t('app.confirm.delete.cancel'));
        expect(cancelBtn).toHaveClass('btn-cancel');
    });

    test('dialog has aria-modal=true', () => {
        render(<ConfirmDeleteModal onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });
});
