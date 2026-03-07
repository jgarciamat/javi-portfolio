import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditTransactionModal } from '@modules/finances/ui/components/EditTransactionModal';
import type { Category, Transaction } from '@modules/finances/domain/types';
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

const categories: Category[] = [
    { id: 'c1', name: 'Food', color: '#ff0000', icon: '🍔' },
    { id: 'c2', name: 'Transport', color: '#0000ff', icon: '🚗' },
];

const mockTransaction: Transaction = {
    id: 'tx-1',
    description: 'Coffee',
    amount: 3.5,
    type: 'EXPENSE',
    category: 'Food',
    date: '2025-03-10T12:00:00.000Z',
    createdAt: '2025-03-10T12:00:00.000Z',
    notes: 'Nice coffee',
};

const mockOnSave = jest.fn().mockResolvedValue(undefined);
const mockOnClose = jest.fn();
const mockOnManageCategories = jest.fn();

const defaultProps = {
    transaction: mockTransaction,
    categories,
    onSave: mockOnSave,
    onClose: mockOnClose,
    onManageCategories: mockOnManageCategories,
    viewYear: 2025,
    viewMonth: 3,
    availableBalance: 1000,
};

describe('EditTransactionModal', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders modal with transaction title', () => {
        render(<EditTransactionModal {...defaultProps} />);
        expect(screen.getByText(/Editar transacción/i)).toBeInTheDocument();
    });

    test('pre-populates description field with transaction description', () => {
        render(<EditTransactionModal {...defaultProps} />);
        const descInput = screen.getByPlaceholderText('Descripción') as HTMLInputElement;
        expect(descInput.value).toBe('Coffee');
    });

    test('pre-populates amount field with transaction amount', () => {
        render(<EditTransactionModal {...defaultProps} />);
        const amountInput = screen.getByPlaceholderText(/Importe/i) as HTMLInputElement;
        expect(amountInput.value).toBe('3.5');
    });

    test('pre-populates notes field with transaction notes', () => {
        render(<EditTransactionModal {...defaultProps} />);
        const notesInput = screen.getByPlaceholderText(/Notas/i) as HTMLTextAreaElement;
        expect(notesInput.value).toBe('Nice coffee');
    });

    test('renders save and cancel buttons', () => {
        render(<EditTransactionModal {...defaultProps} />);
        expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
        expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    test('calls onClose when cancel button is clicked', () => {
        render(<EditTransactionModal {...defaultProps} />);
        fireEvent.click(screen.getByText('Cancelar'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    test('calls onClose when X close button is clicked', () => {
        render(<EditTransactionModal {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Cancelar'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    test('calls onClose when Escape key is pressed', () => {
        render(<EditTransactionModal {...defaultProps} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(mockOnClose).toHaveBeenCalled();
    });

    test('calls onClose when overlay backdrop is clicked', () => {
        render(<EditTransactionModal {...defaultProps} />);
        const overlay = document.querySelector('.edit-tx-overlay') as HTMLElement;
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
    });

    test('does not call onClose when modal content is clicked', () => {
        render(<EditTransactionModal {...defaultProps} />);
        const modal = document.querySelector('.edit-tx-modal') as HTMLElement;
        fireEvent.click(modal);
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('calls onSave with updated values on submit', async () => {
        render(<EditTransactionModal {...defaultProps} />);
        const descInput = screen.getByPlaceholderText('Descripción');
        fireEvent.change(descInput, { target: { value: 'Latte' } });
        fireEvent.click(screen.getByText('Guardar cambios'));
        await waitFor(() => expect(mockOnSave).toHaveBeenCalledWith('tx-1', expect.objectContaining({ description: 'Latte' })));
    });

    test('shows error when submitting with empty description', async () => {
        render(<EditTransactionModal {...defaultProps} />);
        const descInput = screen.getByPlaceholderText('Descripción');
        fireEvent.change(descInput, { target: { value: '' } });
        const form = document.querySelector('form')!;
        fireEvent.submit(form);
        await waitFor(() => expect(screen.getByText('Rellena todos los campos')).toBeInTheDocument());
    });

    test('calls onManageCategories when __manage__ is selected', () => {
        render(<EditTransactionModal {...defaultProps} />);
        const selects = screen.getAllByRole('combobox');
        const categorySelect = selects[1]; // second select is category
        fireEvent.change(categorySelect, { target: { value: '__manage__' } });
        expect(mockOnManageCategories).toHaveBeenCalled();
    });

    test('pre-populates category select', () => {
        render(<EditTransactionModal {...defaultProps} />);
        const selects = screen.getAllByRole('combobox');
        const categorySelect = selects[1] as HTMLSelectElement;
        expect(categorySelect.value).toBe('Food');
    });

    test('pre-populates type select', () => {
        render(<EditTransactionModal {...defaultProps} />);
        const selects = screen.getAllByRole('combobox');
        const typeSelect = selects[0] as HTMLSelectElement;
        expect(typeSelect.value).toBe('EXPENSE');
    });

    test('renders modal as dialog with correct aria attributes', () => {
        render(<EditTransactionModal {...defaultProps} />);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    test('renders with null notes pre-populated as empty string', () => {
        const txNoNotes = { ...mockTransaction, notes: null };
        render(<EditTransactionModal {...defaultProps} transaction={txNoNotes} />);
        const notesInput = screen.getByPlaceholderText(/Notas/i) as HTMLTextAreaElement;
        expect(notesInput.value).toBe('');
    });
});
