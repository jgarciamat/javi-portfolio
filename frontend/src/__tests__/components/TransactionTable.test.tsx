import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionTable } from '@modules/finances/ui/components/TransactionTable';
import type { Transaction } from '@modules/finances/domain/types';

const mockOnDelete = jest.fn();
const mockOnPatch = jest.fn();

const txExpense: Transaction = {
    id: 't1', description: 'Bus ticket', amount: 10, type: 'EXPENSE',
    category: 'Transport', date: '2025-01-05T00:00:00.000Z', createdAt: '2025-01-05T00:00:00.000Z',
    done: false, notes: null,
};
const txIncome: Transaction = {
    id: 't2', description: 'Salary', amount: 2000, type: 'INCOME',
    category: 'Work', date: '2025-01-01T00:00:00.000Z', createdAt: '2025-01-01T00:00:00.000Z',
    done: false, notes: null,
};
const txSaving: Transaction = {
    id: 't3', description: 'Savings pot', amount: 100, type: 'SAVING',
    category: 'Savings', date: '2025-01-10T00:00:00.000Z', createdAt: '2025-01-10T00:00:00.000Z',
    done: false, notes: null,
};
const txDone: Transaction = {
    id: 't4', description: 'Paid bill', amount: 50, type: 'EXPENSE',
    category: 'Bills', date: '2025-01-12T00:00:00.000Z', createdAt: '2025-01-12T00:00:00.000Z',
    done: true, notes: 'Paid via bank',
};

describe('TransactionTable', () => {
    beforeEach(() => jest.clearAllMocks());

    test('shows empty state when no transactions', () => {
        render(<TransactionTable transactions={[]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        expect(screen.getByText(/No hay transacciones aún/i)).toBeInTheDocument();
    });

    test('renders EXPENSE transaction with correct badge and amount', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        expect(screen.getAllByText('Bus ticket').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/↓ Gasto/i).length).toBeGreaterThan(0);
    });

    test('renders INCOME transaction with correct badge', () => {
        render(<TransactionTable transactions={[txIncome]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        expect(screen.getAllByText('Salary').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/↑ Ingreso/i).length).toBeGreaterThan(0);
    });

    test('renders SAVING transaction with correct badge', () => {
        render(<TransactionTable transactions={[txSaving]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        expect(screen.getAllByText('Savings pot').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Ahorro/i).length).toBeGreaterThan(0);
    });

    test('calls onDelete with correct id when delete button is clicked', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        const deleteBtns = screen.getAllByLabelText('Eliminar');
        fireEvent.click(deleteBtns[0]);
        expect(mockOnDelete).toHaveBeenCalledWith('t1');
    });

    test('calls onDelete from mobile card delete button', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        const deleteBtns = screen.getAllByLabelText('Eliminar');
        expect(deleteBtns.length).toBe(2);
        fireEvent.click(deleteBtns[1]);
        expect(mockOnDelete).toHaveBeenCalledWith('t1');
    });

    test('renders multiple transactions', () => {
        render(<TransactionTable transactions={[txExpense, txIncome, txSaving]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        expect(screen.getAllByText('Bus ticket').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Salary').length).toBeGreaterThan(0);
    });

    // ── done checkbox ─────────────────────────────────────────────────────────

    test('done checkbox is unchecked when done=false', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        const checkboxes = screen.getAllByRole('checkbox');
        // desktop + mobile = 2 checkboxes per transaction
        checkboxes.forEach((cb) => expect(cb).not.toBeChecked());
    });

    test('done checkbox is checked when done=true', () => {
        render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach((cb) => expect(cb).toBeChecked());
    });

    test('clicking done checkbox calls onPatch with done=true', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        expect(mockOnPatch).toHaveBeenCalledWith('t1', { done: true });
    });

    test('clicking done checkbox on mobile card calls onPatch', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[1]);
        expect(mockOnPatch).toHaveBeenCalledWith('t1', { done: true });
    });

    test('unchecking done checkbox calls onPatch with done=false', () => {
        render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        expect(mockOnPatch).toHaveBeenCalledWith('t4', { done: false });
    });

    // ── notes inline edit ─────────────────────────────────────────────────────

    test('shows "+" placeholder when notes is null', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        expect(screen.getAllByText(/\+ añadir nota/i).length).toBeGreaterThan(0);
    });

    test('shows existing notes text', () => {
        render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        expect(screen.getAllByText('Paid via bank').length).toBeGreaterThan(0);
    });

    test('clicking notes text shows edit input', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        const noteTexts = screen.getAllByText('Paid via bank');
        await user.click(noteTexts[0]);
        const inputs = container.querySelectorAll('.tx-notes-edit-input');
        expect(inputs.length).toBeGreaterThan(0);
    });

    test('pressing Enter on notes input commits the note', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        await user.click(screen.getAllByText('Paid via bank')[0]);
        const input = container.querySelector('.tx-notes-edit-input') as HTMLInputElement;
        await user.clear(input);
        await user.type(input, 'New note');
        await user.keyboard('{Enter}');
        expect(mockOnPatch).toHaveBeenCalledWith('t4', { notes: 'New note' });
    });

    test('pressing Escape on notes input cancels edit without calling onPatch', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        await user.click(screen.getAllByText('Paid via bank')[0]);
        const input = container.querySelector('.tx-notes-edit-input') as HTMLInputElement;
        await user.clear(input);
        await user.type(input, 'Cancelled edit');
        await user.keyboard('{Escape}');
        expect(mockOnPatch).not.toHaveBeenCalled();
    });

    test('blur on notes input commits the note', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        await user.click(screen.getAllByText('Paid via bank')[0]);
        const input = container.querySelector('.tx-notes-edit-input') as HTMLInputElement;
        await user.clear(input);
        await user.type(input, 'Blur commit');
        fireEvent.blur(input);
        expect(mockOnPatch).toHaveBeenCalledWith('t4', { notes: 'Blur commit' });
    });

    test('committing empty notes calls onPatch with null', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        await user.click(screen.getAllByText('Paid via bank')[0]);
        const input = container.querySelector('.tx-notes-edit-input') as HTMLInputElement;
        await user.clear(input);
        await user.type(input, '   ');
        await user.keyboard('{Enter}');
        expect(mockOnPatch).toHaveBeenCalledWith('t4', { notes: null });
    });

    test('clicking placeholder note opens edit with empty input', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        const placeholders = screen.getAllByText(/\+ añadir nota/i);
        await user.click(placeholders[0]);
        const input = container.querySelector('.tx-notes-edit-input') as HTMLInputElement;
        expect(input).not.toBeNull();
        expect(input.value).toBe('');
    });

    // ── mobile card notes inline edit ────────────────────────────────────────

    test('clicking notes text in mobile card shows edit input', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        // index 1 is the mobile card span (index 0 is desktop)
        const noteTexts = screen.getAllByText('Paid via bank');
        await user.click(noteTexts[1]);
        const inputs = container.querySelectorAll('.tx-notes-edit-input');
        expect(inputs.length).toBeGreaterThan(0);
    });

    test('pressing Enter on mobile notes input commits the note', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        await user.click(screen.getAllByText('Paid via bank')[1]);
        const inputs = container.querySelectorAll('.tx-notes-edit-input');
        const mobileInput = inputs[inputs.length - 1] as HTMLInputElement;
        fireEvent.change(mobileInput, { target: { value: 'Mobile note' } });
        fireEvent.keyDown(mobileInput, { key: 'Enter' });
        expect(mockOnPatch).toHaveBeenCalledWith('t4', { notes: 'Mobile note' });
    });

    test('pressing Escape on mobile notes input cancels edit', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        await user.click(screen.getAllByText('Paid via bank')[1]);
        expect(container.querySelectorAll('.tx-notes-edit-input').length).toBeGreaterThan(0);
        const inputs = container.querySelectorAll('.tx-notes-edit-input');
        const mobileInput = inputs[inputs.length - 1] as HTMLInputElement;
        fireEvent.keyDown(mobileInput, { key: 'Escape' });
        expect(mockOnPatch).not.toHaveBeenCalled();
    });

    test('blur on mobile notes input commits the note', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txDone]} onDelete={mockOnDelete} onPatch={mockOnPatch} />);
        await user.click(screen.getAllByText('Paid via bank')[1]);
        const inputs = container.querySelectorAll('.tx-notes-edit-input');
        const mobileInput = inputs[inputs.length - 1] as HTMLInputElement;
        fireEvent.change(mobileInput, { target: { value: 'Mobile blur' } });
        fireEvent.blur(mobileInput);
        expect(mockOnPatch).toHaveBeenCalledWith('t4', { notes: 'Mobile blur' });
    });
});
