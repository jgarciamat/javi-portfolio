import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionTable } from '@modules/finances/ui/components/TransactionTable';
import type { Transaction } from '@modules/finances/domain/types';
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

const mockOnDelete = jest.fn();
const mockOnPatch = jest.fn();
const mockOnEdit = jest.fn();

const txExpense: Transaction = {
    id: 't1', description: 'Bus ticket', amount: 10, type: 'EXPENSE',
    category: 'Transport', date: '2025-01-05T00:00:00.000Z', createdAt: '2025-01-05T00:00:00.000Z',
    notes: null,
};
const txIncome: Transaction = {
    id: 't2', description: 'Salary', amount: 2000, type: 'INCOME',
    category: 'Work', date: '2025-01-01T00:00:00.000Z', createdAt: '2025-01-01T00:00:00.000Z',
    notes: null,
};
const txSaving: Transaction = {
    id: 't3', description: 'Savings pot', amount: 100, type: 'SAVING',
    category: 'Savings', date: '2025-01-10T00:00:00.000Z', createdAt: '2025-01-10T00:00:00.000Z',
    notes: null,
};
const txWithNotes: Transaction = {
    id: 't4', description: 'Paid bill', amount: 50, type: 'EXPENSE',
    category: 'Bills', date: '2025-01-12T00:00:00.000Z', createdAt: '2025-01-12T00:00:00.000Z',
    notes: 'Paid via bank',
};

describe('TransactionTable', () => {
    beforeEach(() => jest.clearAllMocks());

    test('shows empty state when no transactions', () => {
        render(<TransactionTable transactions={[]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        expect(screen.getByText(/No hay transacciones aún/i)).toBeInTheDocument();
    });

    test('renders EXPENSE transaction with correct badge and amount', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        expect(screen.getAllByText('Bus ticket').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/↓ Gasto/i).length).toBeGreaterThan(0);
    });

    test('renders INCOME transaction with correct badge', () => {
        render(<TransactionTable transactions={[txIncome]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        expect(screen.getAllByText('Salary').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/↑ Ingreso/i).length).toBeGreaterThan(0);
    });

    test('renders SAVING transaction with correct badge', () => {
        render(<TransactionTable transactions={[txSaving]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        expect(screen.getAllByText('Savings pot').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Ahorro/i).length).toBeGreaterThan(0);
    });

    // ── delete confirmation modal ─────────────────────────────────────────────

    test('clicking delete button opens confirmation modal, not calling onDelete yet', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        const deleteBtns = screen.getAllByLabelText(t('app.transaction.table.delete'));
        fireEvent.click(deleteBtns[0]);
        // Modal should be visible
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(t('app.confirm.delete.title'))).toBeInTheDocument();
        expect(screen.getByText(t('app.confirm.delete.message'))).toBeInTheDocument();
        // onDelete must NOT have been called yet
        expect(mockOnDelete).not.toHaveBeenCalled();
    });

    test('confirming delete calls onDelete with correct id and closes modal', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        fireEvent.click(screen.getAllByLabelText(t('app.transaction.table.delete'))[0]);
        // Click the red confirm button
        fireEvent.click(screen.getByText(t('app.confirm.delete.confirm')));
        expect(mockOnDelete).toHaveBeenCalledWith('t1');
        expect(mockOnDelete).toHaveBeenCalledTimes(1);
        // Modal should be gone
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('cancelling delete closes modal without calling onDelete', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        fireEvent.click(screen.getAllByLabelText(t('app.transaction.table.delete'))[0]);
        fireEvent.click(screen.getByText(t('app.confirm.delete.cancel')));
        expect(mockOnDelete).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('pressing Escape closes confirmation modal without calling onDelete', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        fireEvent.click(screen.getAllByLabelText(t('app.transaction.table.delete'))[0]);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mockOnDelete).not.toHaveBeenCalled();
    });

    test('clicking overlay closes confirmation modal without calling onDelete', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        fireEvent.click(screen.getAllByLabelText(t('app.transaction.table.delete'))[0]);
        const overlay = screen.getByRole('dialog');
        fireEvent.click(overlay);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mockOnDelete).not.toHaveBeenCalled();
    });

    test('mobile card delete button also opens confirmation modal', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        const deleteBtns = screen.getAllByLabelText(t('app.transaction.table.delete'));
        expect(deleteBtns.length).toBe(2); // desktop + mobile
        fireEvent.click(deleteBtns[1]);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(mockOnDelete).not.toHaveBeenCalled();
    });

    test('mobile card confirm delete calls onDelete with correct id', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        fireEvent.click(screen.getAllByLabelText(t('app.transaction.table.delete'))[1]);
        fireEvent.click(screen.getByText(t('app.confirm.delete.confirm')));
        expect(mockOnDelete).toHaveBeenCalledWith('t1');
    });

    test('renders multiple transactions', () => {
        render(<TransactionTable transactions={[txExpense, txIncome, txSaving]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        expect(screen.getAllByText('Bus ticket').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Salary').length).toBeGreaterThan(0);
    });

    // ── notes inline edit ─────────────────────────────────────────────────────

    test('shows "+" placeholder when notes is null', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        expect(screen.getAllByText(/\+ añadir nota/i).length).toBeGreaterThan(0);
    });

    test('shows existing notes text', () => {
        render(<TransactionTable transactions={[txWithNotes]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        expect(screen.getAllByText('Paid via bank').length).toBeGreaterThan(0);
    });

    test('clicking notes text shows edit input', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txWithNotes]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        const noteTexts = screen.getAllByText('Paid via bank');
        await user.click(noteTexts[0]);
        const inputs = container.querySelectorAll('.tx-notes-edit-input');
        expect(inputs.length).toBeGreaterThan(0);
    });

    test('pressing Enter on notes input commits the note', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txWithNotes]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        await user.click(screen.getAllByText('Paid via bank')[0]);
        const input = container.querySelector('.tx-notes-edit-input') as HTMLInputElement;
        await user.clear(input);
        await user.type(input, 'New note');
        await user.keyboard('{Enter}');
        expect(mockOnPatch).toHaveBeenCalledWith('t4', { notes: 'New note' });
    });

    test('pressing Escape on notes input cancels edit without calling onPatch', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txWithNotes]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        await user.click(screen.getAllByText('Paid via bank')[0]);
        const input = container.querySelector('.tx-notes-edit-input') as HTMLInputElement;
        await user.clear(input);
        await user.type(input, 'Cancelled edit');
        await user.keyboard('{Escape}');
        expect(mockOnPatch).not.toHaveBeenCalled();
    });

    test('blur on notes input commits the note', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txWithNotes]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        await user.click(screen.getAllByText('Paid via bank')[0]);
        const input = container.querySelector('.tx-notes-edit-input') as HTMLInputElement;
        await user.clear(input);
        await user.type(input, 'Blur commit');
        fireEvent.blur(input);
        expect(mockOnPatch).toHaveBeenCalledWith('t4', { notes: 'Blur commit' });
    });

    test('committing empty notes calls onPatch with null', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txWithNotes]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        await user.click(screen.getAllByText('Paid via bank')[0]);
        const input = container.querySelector('.tx-notes-edit-input') as HTMLInputElement;
        await user.clear(input);
        await user.type(input, '   ');
        await user.keyboard('{Enter}');
        expect(mockOnPatch).toHaveBeenCalledWith('t4', { notes: null });
    });

    test('clicking placeholder note opens edit with empty input', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        const placeholders = screen.getAllByText(/\+ añadir nota/i);
        await user.click(placeholders[0]);
        const input = container.querySelector('.tx-notes-edit-input') as HTMLInputElement;
        expect(input).not.toBeNull();
        expect(input.value).toBe('');
    });

    // ── mobile card notes inline edit ────────────────────────────────────────

    test('clicking notes text in mobile card shows edit input', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txWithNotes]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        // index 1 is the mobile card span (index 0 is desktop)
        const noteTexts = screen.getAllByText('Paid via bank');
        await user.click(noteTexts[1]);
        const inputs = container.querySelectorAll('.tx-notes-edit-input');
        expect(inputs.length).toBeGreaterThan(0);
    });

    test('pressing Enter on mobile notes input commits the note', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txWithNotes]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        await user.click(screen.getAllByText('Paid via bank')[1]);
        const inputs = container.querySelectorAll('.tx-notes-edit-input');
        const mobileInput = inputs[inputs.length - 1] as HTMLInputElement;
        fireEvent.change(mobileInput, { target: { value: 'Mobile note' } });
        fireEvent.keyDown(mobileInput, { key: 'Enter' });
        expect(mockOnPatch).toHaveBeenCalledWith('t4', { notes: 'Mobile note' });
    });

    test('pressing Escape on mobile notes input cancels edit', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txWithNotes]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        await user.click(screen.getAllByText('Paid via bank')[1]);
        expect(container.querySelectorAll('.tx-notes-edit-input').length).toBeGreaterThan(0);
        const inputs = container.querySelectorAll('.tx-notes-edit-input');
        const mobileInput = inputs[inputs.length - 1] as HTMLInputElement;
        fireEvent.keyDown(mobileInput, { key: 'Escape' });
        expect(mockOnPatch).not.toHaveBeenCalled();
    });

    test('blur on mobile notes input commits the note', async () => {
        const user = userEvent.setup();
        const { container } = render(<TransactionTable transactions={[txWithNotes]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        await user.click(screen.getAllByText('Paid via bank')[1]);
        const inputs = container.querySelectorAll('.tx-notes-edit-input');
        const mobileInput = inputs[inputs.length - 1] as HTMLInputElement;
        fireEvent.change(mobileInput, { target: { value: 'Mobile blur' } });
        fireEvent.blur(mobileInput);
        expect(mockOnPatch).toHaveBeenCalledWith('t4', { notes: 'Mobile blur' });
    });

    // ── edit button ───────────────────────────────────────────────────────────

    test('calls onEdit with the correct transaction when edit button is clicked (desktop)', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        const editBtns = screen.getAllByLabelText('Editar');
        fireEvent.click(editBtns[0]);
        expect(mockOnEdit).toHaveBeenCalledWith(txExpense);
    });

    test('calls onEdit with the correct transaction when edit button is clicked (mobile card)', () => {
        render(<TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />);
        const editBtns = screen.getAllByLabelText('Editar');
        expect(editBtns.length).toBe(2); // desktop + mobile
        fireEvent.click(editBtns[1]);
        expect(mockOnEdit).toHaveBeenCalledWith(txExpense);
    });

    // ── day separators ────────────────────────────────────────────────────────

    test('renders one day separator when all transactions are on the same day', () => {
        const sameDayTxs: Transaction[] = [
            { ...txExpense, id: 'a', date: '2025-01-05T08:00:00.000Z' },
            { ...txIncome, id: 'b', date: '2025-01-05T14:00:00.000Z' },
        ];
        const { container } = render(
            <TransactionTable transactions={sameDayTxs} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />
        );
        // Desktop: exactly 1 separator row
        expect(container.querySelectorAll('.tx-day-separator').length).toBe(1);
        // Mobile: exactly 1 day header
        expect(container.querySelectorAll('.tx-day-header').length).toBe(1);
    });

    test('renders two day separators for transactions on two different days', () => {
        const twoDayTxs: Transaction[] = [
            { ...txExpense, id: 'a', date: '2025-01-05T08:00:00.000Z' },
            { ...txIncome, id: 'b', date: '2025-01-06T10:00:00.000Z' },
        ];
        const { container } = render(
            <TransactionTable transactions={twoDayTxs} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />
        );
        expect(container.querySelectorAll('.tx-day-separator').length).toBe(2);
        expect(container.querySelectorAll('.tx-day-header').length).toBe(2);
    });

    test('day separator label contains the day of the week and date', () => {
        const { container } = render(
            <TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />
        );
        // The label is rendered both in .tx-day-label (desktop) and .tx-day-header (mobile)
        const labelEl = container.querySelector('.tx-day-label');
        expect(labelEl).not.toBeNull();
        expect(labelEl!.textContent!.trim().length).toBeGreaterThan(0);
        // Should contain a digit (the day number)
        expect(labelEl!.textContent).toMatch(/\d/);
    });

    test('transactions on the same day are grouped together (no extra separators)', () => {
        const threeSameDayTxs: Transaction[] = [
            { ...txExpense, id: 'x1', date: '2025-03-10T09:00:00.000Z' },
            { ...txIncome, id: 'x2', date: '2025-03-10T11:00:00.000Z' },
            { ...txSaving, id: 'x3', date: '2025-03-10T15:00:00.000Z' },
        ];
        const { container } = render(
            <TransactionTable transactions={threeSameDayTxs} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />
        );
        expect(container.querySelectorAll('.tx-day-separator').length).toBe(1);
        // All 3 transactions rendered (desktop + mobile = 6 descriptions)
        expect(screen.getAllByText('Bus ticket').length).toBe(2); // desktop + mobile
    });

    // ── collapsible day groups ─────────────────────────────────────────────────

    test('clicking the day separator collapses the group (transactions disappear)', () => {
        const { container } = render(
            <TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />
        );
        // Initially visible
        expect(screen.getAllByText('Bus ticket').length).toBe(2); // desktop + mobile

        // Click the desktop separator row to collapse
        const separator = container.querySelector('.tx-day-separator--clickable')!;
        fireEvent.click(separator);

        // After collapse, transactions are hidden
        expect(screen.queryAllByText('Bus ticket').length).toBe(0);
    });

    test('clicking the day separator twice expands the group again', () => {
        const { container } = render(
            <TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />
        );
        const separator = container.querySelector('.tx-day-separator--clickable')!;

        fireEvent.click(separator); // collapse
        expect(screen.queryAllByText('Bus ticket').length).toBe(0);

        fireEvent.click(separator); // expand
        expect(screen.getAllByText('Bus ticket').length).toBe(2);
    });

    test('chevron rotates when group is collapsed', () => {
        const { container } = render(
            <TransactionTable transactions={[txExpense]} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />
        );
        const separator = container.querySelector('.tx-day-separator--clickable')!;
        const chevron = separator.querySelector('.tx-day-chevron')!;

        expect(chevron.classList.contains('tx-day-chevron--collapsed')).toBe(false);
        fireEvent.click(separator);
        expect(chevron.classList.contains('tx-day-chevron--collapsed')).toBe(true);
    });

    test('collapsing one day does not affect other days', () => {
        const twoDayTxs: Transaction[] = [
            { ...txExpense, id: 'a', date: '2025-01-05T08:00:00.000Z' },
            { ...txIncome, id: 'b', date: '2025-01-06T10:00:00.000Z' },
        ];
        const { container } = render(
            <TransactionTable transactions={twoDayTxs} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />
        );
        const separators = container.querySelectorAll('.tx-day-separator--clickable');
        expect(separators.length).toBe(2);

        // Collapse only the first day
        fireEvent.click(separators[0]);

        // Bus ticket (day 1) hidden, Salary (day 2) still visible
        expect(screen.queryAllByText('Bus ticket').length).toBe(0);
        expect(screen.getAllByText('Salary').length).toBe(2); // desktop + mobile
    });

    test('day count badge shows number of transactions in the group', () => {
        const sameDayTxs: Transaction[] = [
            { ...txExpense, id: 'a', date: '2025-01-05T08:00:00.000Z' },
            { ...txIncome, id: 'b', date: '2025-01-05T14:00:00.000Z' },
        ];
        const { container } = render(
            <TransactionTable transactions={sameDayTxs} onDelete={mockOnDelete} onPatch={mockOnPatch} onEdit={mockOnEdit} />
        );
        const countBadge = container.querySelector('.tx-day-separator .tx-day-count');
        expect(countBadge?.textContent).toBe('(2)');
    });
});
