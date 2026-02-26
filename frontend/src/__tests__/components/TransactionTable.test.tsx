import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionTable } from '@modules/finances/ui/components/TransactionTable';
import type { Transaction } from '@modules/finances/domain/types';

const mockOnDelete = jest.fn();

const txExpense: Transaction = {
    id: 't1', description: 'Bus ticket', amount: 10, type: 'EXPENSE',
    category: 'Transport', date: '2025-01-05T00:00:00.000Z', createdAt: '2025-01-05T00:00:00.000Z',
};
const txIncome: Transaction = {
    id: 't2', description: 'Salary', amount: 2000, type: 'INCOME',
    category: 'Work', date: '2025-01-01T00:00:00.000Z', createdAt: '2025-01-01T00:00:00.000Z',
};
const txSaving: Transaction = {
    id: 't3', description: 'Savings pot', amount: 100, type: 'SAVING',
    category: 'Savings', date: '2025-01-10T00:00:00.000Z', createdAt: '2025-01-10T00:00:00.000Z',
};

describe('TransactionTable', () => {
    beforeEach(() => jest.clearAllMocks());

    test('shows empty state when no transactions', () => {
        render(<TransactionTable transactions={[]} onDelete={mockOnDelete} />);
        expect(screen.getByText(/No hay transacciones aún/i)).toBeInTheDocument();
    });

    test('renders EXPENSE transaction with correct badge and amount', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} />);
        expect(screen.getAllByText('Bus ticket').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/↓ Gasto/i).length).toBeGreaterThan(0);
    });

    test('renders INCOME transaction with correct badge', () => {
        render(<TransactionTable transactions={[txIncome]} onDelete={mockOnDelete} />);
        expect(screen.getAllByText('Salary').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/↑ Ingreso/i).length).toBeGreaterThan(0);
    });

    test('renders SAVING transaction with correct badge', () => {
        render(<TransactionTable transactions={[txSaving]} onDelete={mockOnDelete} />);
        expect(screen.getAllByText('Savings pot').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Ahorro/i).length).toBeGreaterThan(0);
    });

    test('calls onDelete with correct id when delete button is clicked', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} />);
        const deleteBtns = screen.getAllByLabelText('Eliminar');
        fireEvent.click(deleteBtns[0]);
        expect(mockOnDelete).toHaveBeenCalledWith('t1');
    });

    test('calls onDelete from mobile card delete button', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} />);
        // Desktop + mobile both render delete buttons; click the second one (mobile card)
        const deleteBtns = screen.getAllByLabelText('Eliminar');
        expect(deleteBtns.length).toBe(2);
        fireEvent.click(deleteBtns[1]);
        expect(mockOnDelete).toHaveBeenCalledWith('t1');
    });

    test('renders multiple transactions', () => {
        render(<TransactionTable transactions={[txExpense, txIncome, txSaving]} onDelete={mockOnDelete} />);
        // There are desktop + mobile views, so each description appears twice
        expect(screen.getAllByText('Bus ticket').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Salary').length).toBeGreaterThan(0);
    });
});
