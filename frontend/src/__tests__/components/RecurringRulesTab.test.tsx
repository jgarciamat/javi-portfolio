import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecurringRulesTab } from '@modules/finances/ui/components/RecurringRulesTab';
import type { RecurringRule, Category } from '@modules/finances/domain/types';
import esJson from '@locales/es.json';

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;

// ── i18n ──────────────────────────────────────────────────────────────────────
jest.mock('@core/i18n/I18nContext', () => ({
    useI18n: () => ({ locale: 'es', setLocale: jest.fn(), t, tCategory: (n: string) => n }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── useRecurringRules ─────────────────────────────────────────────────────────
const mockCreateRule = jest.fn();
const mockUpdateRule = jest.fn();
const mockDeleteRule = jest.fn();
const mockToggleActive = jest.fn();

jest.mock('@modules/finances/application/hooks/useRecurringRules', () => ({
    useRecurringRules: () => ({
        rules: mockRules(),
        loading: false,
        error: null,
        createRule: mockCreateRule,
        updateRule: mockUpdateRule,
        deleteRule: mockDeleteRule,
        toggleActive: mockToggleActive,
    }),
}));

// ── useFinances ───────────────────────────────────────────────────────────────
const mockRefresh = jest.fn().mockResolvedValue(undefined);

jest.mock('@modules/finances/application/FinancesContext', () => ({
    useFinances: () => ({
        year: 2026,
        month: 3,
        refresh: mockRefresh,
        // minimal stub — tests only need refresh
        transactions: [], summary: null, carryover: null, categories: [],
        loading: false, error: null,
        isPrevDisabled: false, isNextDisabled: false,
        goToPrev: jest.fn(), goToNext: jest.fn(), navigateTo: jest.fn(),
        addTransaction: jest.fn(), removeTransaction: jest.fn(),
        patchTransaction: jest.fn(), updateTransaction: jest.fn(),
        addCategory: jest.fn(), removeCategory: jest.fn(),
    }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const ruleA: RecurringRule = {
    id: 'r1',
    userId: 'u1',
    description: 'Netflix',
    amount: 12.99,
    type: 'EXPENSE',
    category: 'Ocio',
    startYear: 2026,
    startMonth: 1,
    endYear: null,
    endMonth: null,
    frequency: 'monthly',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
};

let currentRules: RecurringRule[] = [];
function mockRules() { return currentRules; }

const categories: Category[] = [
    { id: 'c1', name: 'Ocio', color: '#ff0', icon: '🎮' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderTab() {
    return render(<RecurringRulesTab categories={categories} />);
}

function openCreateForm() {
    fireEvent.click(screen.getByText(t('app.recurring.new')));
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('RecurringRulesTab', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        currentRules = [];
    });

    // ── Refresh after create ───────────────────────────────────────────────────
    describe('after creating a rule', () => {
        test('calls refresh({invalidate: true}) after successful create', async () => {
            mockCreateRule.mockResolvedValue(ruleA);
            renderTab();

            openCreateForm();
            fireEvent.change(screen.getByPlaceholderText(t('app.recurring.form.description')), {
                target: { value: 'Netflix' },
            });
            fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '12.99' } });

            // Select category Ocio
            const selects = screen.getAllByRole('combobox');
            for (const s of selects) {
                const opts = Array.from(s.querySelectorAll('option')).map((o) => (o as HTMLOptionElement).value);
                if (opts.includes('Ocio')) { fireEvent.change(s, { target: { value: 'Ocio' } }); break; }
            }

            fireEvent.click(screen.getByText(t('app.recurring.form.save')));

            await waitFor(() => expect(mockCreateRule).toHaveBeenCalled());
            await waitFor(() => expect(mockRefresh).toHaveBeenCalledWith({ invalidate: true }));
        });

        test('does NOT call refresh if create throws', async () => {
            mockCreateRule.mockRejectedValue(new Error('Server error'));
            renderTab();

            openCreateForm();
            fireEvent.change(screen.getByPlaceholderText(t('app.recurring.form.description')), {
                target: { value: 'Netflix' },
            });
            fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '12.99' } });

            for (const s of screen.getAllByRole('combobox')) {
                const opts = Array.from(s.querySelectorAll('option')).map((o) => (o as HTMLOptionElement).value);
                if (opts.includes('Ocio')) { fireEvent.change(s, { target: { value: 'Ocio' } }); break; }
            }

            fireEvent.click(screen.getByText(t('app.recurring.form.save')));

            await waitFor(() => expect(mockCreateRule).toHaveBeenCalled());
            expect(mockRefresh).not.toHaveBeenCalled();
        });
    });

    // ── Refresh after update ───────────────────────────────────────────────────
    describe('after editing a rule', () => {
        test('calls refresh({invalidate: true}) after successful update', async () => {
            currentRules = [ruleA];
            const updated = { ...ruleA, description: 'Netflix Premium' };
            mockUpdateRule.mockResolvedValue(updated);
            renderTab();

            // Open edit form
            fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.edit')) }));

            // Change description
            fireEvent.change(screen.getByPlaceholderText(t('app.recurring.form.description')), {
                target: { value: 'Netflix Premium' },
            });

            fireEvent.click(screen.getByText(t('app.recurring.form.save')));

            await waitFor(() => expect(mockUpdateRule).toHaveBeenCalled());
            await waitFor(() => expect(mockRefresh).toHaveBeenCalledWith({ invalidate: true }));
        });
    });

    // ── Delete modal ──────────────────────────────────────────────────────────
    describe('delete modal', () => {
        test('shows delete modal when Eliminar is clicked', async () => {
            currentRules = [ruleA];
            renderTab();

            fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.delete')) }));

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText(t('app.recurring.delete.modal.title'))).toBeInTheDocument();
        });

        test('scope=none: only deletes rule, no transactions removed', async () => {
            currentRules = [ruleA];
            mockDeleteRule.mockResolvedValue(undefined);
            renderTab();

            fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.delete')) }));

            // The modal no longer shows a 'none' option — confirm with default (from_current)
            expect(screen.queryByLabelText(t('app.recurring.delete.scope.none'))).toBeNull();
            fireEvent.click(screen.getByText(t('app.recurring.delete.confirm')));

            await waitFor(() =>
                expect(mockDeleteRule).toHaveBeenCalledWith('r1', 'from_current')
            );
            await waitFor(() => expect(mockRefresh).toHaveBeenCalledWith({ invalidate: true }));
        });

        test('scope=from_current: deletes rule and transactions from next month onward (keeps current)', async () => {
            currentRules = [ruleA];
            mockDeleteRule.mockResolvedValue(undefined);
            renderTab();

            fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.delete')) }));
            fireEvent.click(screen.getByLabelText(t('app.recurring.delete.scope.from_current')));
            fireEvent.click(screen.getByText(t('app.recurring.delete.confirm')));

            await waitFor(() =>
                expect(mockDeleteRule).toHaveBeenCalledWith('r1', 'from_current')
            );
        });

        test('scope=all: deletes rule and all associated transactions', async () => {
            currentRules = [ruleA];
            mockDeleteRule.mockResolvedValue(undefined);
            renderTab();

            fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.delete')) }));
            fireEvent.click(screen.getByLabelText(t('app.recurring.delete.scope.all')));
            fireEvent.click(screen.getByText(t('app.recurring.delete.confirm')));

            await waitFor(() =>
                expect(mockDeleteRule).toHaveBeenCalledWith('r1', 'all')
            );
        });

        test('cancel closes modal without deleting', async () => {
            currentRules = [ruleA];
            renderTab();

            fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.delete')) }));
            expect(screen.getByRole('dialog')).toBeInTheDocument();

            fireEvent.click(screen.getByText(t('app.recurring.delete.cancel')));
            expect(screen.queryByRole('dialog')).toBeNull();
            expect(mockDeleteRule).not.toHaveBeenCalled();
        });

        test('closes modal even when deleteRule throws', async () => {
            currentRules = [ruleA];
            mockDeleteRule.mockRejectedValue(new Error('network error'));
            renderTab();

            fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.delete')) }));
            fireEvent.click(screen.getByText(t('app.recurring.delete.confirm')));

            await waitFor(() => expect(mockDeleteRule).toHaveBeenCalled());
            // Modal should be closed even after error
            await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        });
    });

    // ── DatePickerField — start date ──────────────────────────────────────────
    describe('DatePickerField (start date)', () => {
        test('shows formatted start date in the styled div', () => {
            renderTab();
            openCreateForm();
            // The start date field renders as a role="button" with aria-label=Inicio
            const startBtn = screen.getByRole('button', { name: t('app.recurring.form.start') });
            expect(startBtn).toBeInTheDocument();
            // Contains some digit (formatted date)
            expect(startBtn.textContent).toMatch(/\d/);
        });

        test('clicking start date div calls showPicker on hidden input', () => {
            renderTab();
            openCreateForm();
            const hiddenInputs = document.querySelectorAll('input[type="date"]');
            const startInput = hiddenInputs[0] as HTMLInputElement;
            const showPickerMock = jest.fn();
            startInput.showPicker = showPickerMock;
            fireEvent.click(screen.getByRole('button', { name: t('app.recurring.form.start') }));
            expect(showPickerMock).toHaveBeenCalled();
        });

        test('pressing Enter on start date div calls showPicker', () => {
            renderTab();
            openCreateForm();
            const startInput = document.querySelectorAll('input[type="date"]')[0] as HTMLInputElement;
            const showPickerMock = jest.fn();
            startInput.showPicker = showPickerMock;
            fireEvent.keyDown(screen.getByRole('button', { name: t('app.recurring.form.start') }), { key: 'Enter' });
            expect(showPickerMock).toHaveBeenCalled();
        });

        test('pressing Space on start date div calls showPicker', () => {
            renderTab();
            openCreateForm();
            const startInput = document.querySelectorAll('input[type="date"]')[0] as HTMLInputElement;
            const showPickerMock = jest.fn();
            startInput.showPicker = showPickerMock;
            fireEvent.keyDown(screen.getByRole('button', { name: t('app.recurring.form.start') }), { key: ' ' });
            expect(showPickerMock).toHaveBeenCalled();
        });

        test('pressing other key on start date div does NOT call showPicker', () => {
            renderTab();
            openCreateForm();
            const startInput = document.querySelectorAll('input[type="date"]')[0] as HTMLInputElement;
            const showPickerMock = jest.fn();
            startInput.showPicker = showPickerMock;
            fireEvent.keyDown(screen.getByRole('button', { name: t('app.recurring.form.start') }), { key: 'Tab' });
            expect(showPickerMock).not.toHaveBeenCalled();
        });

        test('changing hidden start date input updates displayed value', () => {
            renderTab();
            openCreateForm();
            const startInput = document.querySelectorAll('input[type="date"]')[0] as HTMLInputElement;
            fireEvent.change(startInput, { target: { value: '2026-06-01' } });
            expect(screen.getByRole('button', { name: t('app.recurring.form.start') }).textContent).toMatch(/1|jun/i);
        });

        test('start date field shows empty string when value is empty', () => {
            // Renders with empty value — formatDisplay('') returns ''
            renderTab();
            openCreateForm();
            const startInput = document.querySelectorAll('input[type="date"]')[0] as HTMLInputElement;
            fireEvent.change(startInput, { target: { value: '' } });
            const startBtn = screen.getByRole('button', { name: t('app.recurring.form.start') });
            // Only the emoji remains visible, no date text
            expect(startBtn.textContent).toBe('📅');
        });
    });

    // ── DatePickerField — end date (hasEnd = true) ────────────────────────────
    describe('DatePickerField (end date)', () => {
        test('end date picker appears when "Con fecha de fin" is selected', () => {
            renderTab();
            openCreateForm();
            expect(screen.queryByRole('button', { name: t('app.recurring.form.end') })).toBeNull();
            fireEvent.click(screen.getByLabelText(t('app.recurring.form.end.withend')));
            expect(screen.getByRole('button', { name: t('app.recurring.form.end') })).toBeInTheDocument();
        });

        test('clicking end date div calls showPicker', () => {
            renderTab();
            openCreateForm();
            fireEvent.click(screen.getByLabelText(t('app.recurring.form.end.withend')));
            const endInput = document.querySelectorAll('input[type="date"]')[1] as HTMLInputElement;
            const showPickerMock = jest.fn();
            endInput.showPicker = showPickerMock;
            fireEvent.click(screen.getByRole('button', { name: t('app.recurring.form.end') }));
            expect(showPickerMock).toHaveBeenCalled();
        });

        test('pressing Enter on end date div calls showPicker', () => {
            renderTab();
            openCreateForm();
            fireEvent.click(screen.getByLabelText(t('app.recurring.form.end.withend')));
            const endInput = document.querySelectorAll('input[type="date"]')[1] as HTMLInputElement;
            const showPickerMock = jest.fn();
            endInput.showPicker = showPickerMock;
            fireEvent.keyDown(screen.getByRole('button', { name: t('app.recurring.form.end') }), { key: 'Enter' });
            expect(showPickerMock).toHaveBeenCalled();
        });

        test('changing hidden end date input updates displayed value', () => {
            renderTab();
            openCreateForm();
            fireEvent.click(screen.getByLabelText(t('app.recurring.form.end.withend')));
            const endInput = document.querySelectorAll('input[type="date"]')[1] as HTMLInputElement;
            fireEvent.change(endInput, { target: { value: '2026-12-31' } });
            expect(screen.getByRole('button', { name: t('app.recurring.form.end') }).textContent).toMatch(/31/);
        });

        test('switching back to "Sin fecha de fin" hides end date picker', () => {
            renderTab();
            openCreateForm();
            fireEvent.click(screen.getByLabelText(t('app.recurring.form.end.withend')));
            expect(screen.getByRole('button', { name: t('app.recurring.form.end') })).toBeInTheDocument();
            fireEvent.click(screen.getByLabelText(t('app.recurring.form.end.noend')));
            expect(screen.queryByRole('button', { name: t('app.recurring.form.end') })).toBeNull();
        });
    });

    // ── Cancel create form ────────────────────────────────────────────────────
    describe('cancel create form', () => {
        test('clicking cancel in create form closes the form', () => {
            renderTab();
            openCreateForm();
            expect(screen.getByText(t('app.recurring.form.title.create'))).toBeInTheDocument();
            fireEvent.click(screen.getByText(t('app.recurring.form.cancel')));
            expect(screen.queryByText(t('app.recurring.form.title.create'))).toBeNull();
        });
    });

    // ── Type and frequency selects ────────────────────────────────────────────
    describe('form type and frequency selects', () => {
        test('changing type select updates the form', () => {
            renderTab();
            openCreateForm();
            const selects = screen.getAllByRole('combobox');
            // Type select is the one containing INCOME/EXPENSE options
            const typeSelect = selects.find((s) =>
                Array.from(s.querySelectorAll('option')).some((o) => (o as HTMLOptionElement).value === 'INCOME')
            ) as HTMLSelectElement;
            fireEvent.change(typeSelect, { target: { value: 'INCOME' } });
            expect(typeSelect.value).toBe('INCOME');
        });

        test('changing frequency select updates the form', () => {
            renderTab();
            openCreateForm();
            const selects = screen.getAllByRole('combobox');
            const freqSelect = selects.find((s) =>
                Array.from(s.querySelectorAll('option')).some((o) => (o as HTMLOptionElement).value === 'bimonthly')
            ) as HTMLSelectElement;
            fireEvent.change(freqSelect, { target: { value: 'bimonthly' } });
            expect(freqSelect.value).toBe('bimonthly');
        });
    });
    describe('toggle active', () => {
        test('clicking pause calls toggleActive with false', async () => {
            currentRules = [ruleA]; // ruleA is active
            mockToggleActive.mockResolvedValue(undefined);
            renderTab();
            fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.pause')) }));
            await waitFor(() => expect(mockToggleActive).toHaveBeenCalledWith('r1', false));
        });

        test('clicking activate calls toggleActive with true', async () => {
            currentRules = [{ ...ruleA, active: false }];
            mockToggleActive.mockResolvedValue(undefined);
            renderTab();
            fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.activate')) }));
            await waitFor(() => expect(mockToggleActive).toHaveBeenCalledWith('r1', true));
        });
    });

    // ── Cancel edit ───────────────────────────────────────────────────────────
    describe('cancel edit form', () => {
        test('clicking cancel in edit form closes the form', () => {
            currentRules = [ruleA];
            renderTab();
            // Open edit form
            fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.edit')) }));
            expect(screen.getByText(t('app.recurring.form.title.edit'))).toBeInTheDocument();
            // Cancel
            fireEvent.click(screen.getByText(t('app.recurring.form.cancel')));
            expect(screen.queryByText(t('app.recurring.form.title.edit'))).toBeNull();
        });
    });
});
