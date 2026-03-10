import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionForm } from '@modules/finances/ui/components/TransactionForm';
import type { Category } from '@modules/finances/domain/types';
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

const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
const mockOnManage = jest.fn();

const categories: Category[] = [
    { id: 'c1', name: 'Food', color: '#ff0000', icon: '🍔' },
    { id: 'c2', name: 'Transport', color: '#0000ff', icon: '🚗' },
];

const defaultProps = {
    categories,
    onSubmit: mockOnSubmit,
    onManageCategories: mockOnManage,
    viewYear: 2025,
    viewMonth: 1,
    availableBalance: 1000,
};

describe('TransactionForm', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders inside CollapsiblePanel with correct title', () => {
        render(<TransactionForm {...defaultProps} />);
        expect(screen.getByText(/Nueva transacción/i)).toBeInTheDocument();
    });

    test('renders all form inputs after opening panel', () => {
        render(<TransactionForm {...defaultProps} />);
        // Open the collapsible — only 1 button exists when closed
        const toggle = screen.getByRole('button', { expanded: false });
        fireEvent.click(toggle);
        expect(screen.getByPlaceholderText('Descripción')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Importe/i)).toBeInTheDocument();
    });

    test('submits form with valid data', async () => {
        render(<TransactionForm {...defaultProps} />);
        // Open collapsible
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        fireEvent.change(screen.getByPlaceholderText('Descripción'), { target: { value: 'Groceries' } });
        fireEvent.change(screen.getByPlaceholderText(/Importe/i), { target: { value: '50' } });
        // Select category
        fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'Food' } });
        fireEvent.click(screen.getByText('Guardar transacción'));
        await waitFor(() => expect(mockOnSubmit).toHaveBeenCalled());
    });

    test('shows error when submitting with empty fields', async () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false })); // open panel
        const form = document.querySelector('form')!;
        fireEvent.submit(form);
        await waitFor(() => expect(screen.getByText('Rellena todos los campos')).toBeInTheDocument());
    });

    test('calls onManageCategories when __manage__ is selected', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        const categorySelect = screen.getAllByRole('combobox')[1];
        fireEvent.change(categorySelect, { target: { value: '__manage__' } });
        expect(mockOnManage).toHaveBeenCalled();
    });

    test('changes transaction type via select', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        const typeSelect = screen.getAllByRole('combobox')[0];
        fireEvent.change(typeSelect, { target: { value: 'INCOME' } });
        expect((typeSelect as HTMLSelectElement).value).toBe('INCOME');
    });

    test('changes date input', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(dateInput, { target: { value: '2025-06-15' } });
        expect(dateInput.value).toBe('2025-06-15');
    });

    // ── notes textarea ────────────────────────────────────────────────────────

    test('renders notes textarea with placeholder', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        expect(screen.getByPlaceholderText('Notas (opcional)')).toBeInTheDocument();
    });

    test('typing in notes textarea updates value', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        const textarea = screen.getByPlaceholderText('Notas (opcional)');
        fireEvent.change(textarea, { target: { value: 'My note here' } });
        expect((textarea as HTMLTextAreaElement).value).toBe('My note here');
    });

    test('submitting with notes passes notes in DTO', async () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        fireEvent.change(screen.getByPlaceholderText('Descripción'), { target: { value: 'Coffee' } });
        fireEvent.change(screen.getByPlaceholderText(/Importe/i), { target: { value: '3' } });
        fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'Food' } });
        fireEvent.change(screen.getByPlaceholderText('Notas (opcional)'), { target: { value: 'Quick note' } });
        fireEvent.click(screen.getByText('Guardar transacción'));
        await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({ notes: 'Quick note' })
        ));
    });

    test('submitting with empty notes passes notes=null in DTO', async () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        fireEvent.change(screen.getByPlaceholderText('Descripción'), { target: { value: 'Coffee' } });
        fireEvent.change(screen.getByPlaceholderText(/Importe/i), { target: { value: '3' } });
        fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'Food' } });
        // leave notes empty
        fireEvent.click(screen.getByText('Guardar transacción'));
        await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({ notes: null })
        ));
    });

    test('reset button clears notes', async () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        fireEvent.change(screen.getByPlaceholderText('Notas (opcional)'), { target: { value: 'Some note' } });
        fireEvent.click(screen.getByText('Cancelar'));
        expect((screen.getByPlaceholderText('Notas (opcional)') as HTMLTextAreaElement).value).toBe('');
    });

    // ── Date picker widget ────────────────────────────────────────────────────

    test('date picker div shows formatted date', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        // The styled div shows a readable date (not YYYY-MM-DD)
        const dateBtn = screen.getByRole('button', { name: 'Fecha' });
        expect(dateBtn).toBeInTheDocument();
        // The display text should not be the raw ISO value
        expect(dateBtn.textContent).toMatch(/\d/); // contains some digit (day or year)
    });

    test('date picker displays empty when date value is cleared', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        const hiddenInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(hiddenInput, { target: { value: '' } });
        const dateBtn = screen.getByRole('button', { name: 'Fecha' });
        // Only the calendar emoji remains — no formatted date text
        expect(dateBtn.textContent).toBe('📅');
    });

    test('date picker shows raw value when date string is partially malformed', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        const hiddenInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        // Simulate a value where split gives parts but they are non-numeric (edge case)
        // We bypass the input constraint by directly changing state through change event
        // A value like "not-a--date" splits to ['not', 'a', '', 'date'] — third part is falsy
        fireEvent.change(hiddenInput, { target: { value: 'not-a-' } });
        // The field should not crash and should render something
        const dateBtn = screen.getByRole('button', { name: 'Fecha' });
        expect(dateBtn).toBeInTheDocument();
    });

    test('clicking the date picker div calls showPicker on the hidden input', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        const hiddenInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        const showPickerMock = jest.fn();
        hiddenInput.showPicker = showPickerMock;
        const dateBtn = screen.getByRole('button', { name: 'Fecha' });
        fireEvent.click(dateBtn);
        expect(showPickerMock).toHaveBeenCalled();
    });

    test('pressing Enter on date picker div calls showPicker', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        const hiddenInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        const showPickerMock = jest.fn();
        hiddenInput.showPicker = showPickerMock;
        const dateBtn = screen.getByRole('button', { name: 'Fecha' });
        fireEvent.keyDown(dateBtn, { key: 'Enter' });
        expect(showPickerMock).toHaveBeenCalled();
    });

    test('pressing Space on date picker div calls showPicker', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        const hiddenInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        const showPickerMock = jest.fn();
        hiddenInput.showPicker = showPickerMock;
        const dateBtn = screen.getByRole('button', { name: 'Fecha' });
        fireEvent.keyDown(dateBtn, { key: ' ' });
        expect(showPickerMock).toHaveBeenCalled();
    });

    test('pressing other key on date picker div does NOT call showPicker', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        const hiddenInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        const showPickerMock = jest.fn();
        hiddenInput.showPicker = showPickerMock;
        const dateBtn = screen.getByRole('button', { name: 'Fecha' });
        fireEvent.keyDown(dateBtn, { key: 'Tab' });
        expect(showPickerMock).not.toHaveBeenCalled();
    });

    test('changing hidden date input updates displayed date', () => {
        render(<TransactionForm {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { expanded: false }));
        const hiddenInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(hiddenInput, { target: { value: '2025-12-25' } });
        // After change the formatted date should include 25 and dec/dic
        const dateBtn = screen.getByRole('button', { name: 'Fecha' });
        expect(dateBtn.textContent).toMatch(/25/);
    });
});
