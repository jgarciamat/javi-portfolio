/**
 * Tests for the RuleForm sub-component (exported indirectly through RecurringRulesTab)
 * and the pure helper functions buildDto / validateForm / ruleToForm.
 *
 * Coverage goal: ≥98% of RecurringRulesTab lines related to the form.
 *
 * Strategy: render <RecurringRulesTab> and open the create/edit form, then
 * interact with every field + edge case.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecurringRulesTab } from '@modules/finances/ui/components/RecurringRulesTab';
import type { RecurringRule, Category } from '@modules/finances/domain/types';
import esJson from '@locales/es.json';

// ── i18n ──────────────────────────────────────────────────────────────────────

const translations = esJson as Record<string, string>;
const t = (key: string) => translations[key] ?? key;

jest.mock('@core/i18n/I18nContext', () => ({
    useI18n: () => ({ locale: 'es', setLocale: jest.fn(), t, tCategory: (n: string) => n }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── useRecurringRules ─────────────────────────────────────────────────────────

const mockCreateRule = jest.fn();
const mockUpdateRule = jest.fn();
const mockDeleteRule = jest.fn();
const mockToggleActive = jest.fn();

let currentRules: RecurringRule[] = [];

jest.mock('@modules/finances/application/hooks/useRecurringRules', () => ({
    useRecurringRules: () => ({
        rules: currentRules,
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
        year: 2026, month: 3, refresh: mockRefresh,
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

const categories: Category[] = [
    { id: 'c1', name: 'Ocio', color: '#ff0', icon: '🎮' },
    { id: 'c2', name: 'Hogar', color: '#0ff', icon: '🏠' },
];

const ruleWithEnd: RecurringRule = {
    id: 'r2',
    userId: 'u1',
    description: 'Gym',
    amount: 40,
    type: 'EXPENSE',
    category: 'Hogar',
    startYear: 2026,
    startMonth: 1,
    endYear: 2026,
    endMonth: 7,
    frequency: 'monthly',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
};

const ruleNoEnd: RecurringRule = {
    id: 'r1',
    userId: 'u1',
    description: 'Netflix',
    amount: 12.99,
    type: 'EXPENSE',
    category: 'Ocio',
    startYear: 2026,
    startMonth: 3,
    endYear: null,
    endMonth: null,
    frequency: 'monthly',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderTab() {
    return render(<RecurringRulesTab categories={categories} />);
}

function openCreateForm() {
    fireEvent.click(screen.getByText(t('app.recurring.new')));
}

/** Get the "Con fecha de fin" radio button */
function getWithEndRadio() {
    return screen.getByRole('radio', { name: t('app.recurring.form.end.withend') });
}

/** Get the "Sin fecha de fin" radio button */
function getNoEndRadio() {
    return screen.getByRole('radio', { name: t('app.recurring.form.end.noend') });
}

/** Get the native date input (only present when "Con fecha de fin" is selected) */
function getEndDateInput() {
    return document.querySelector('input[type="date"]') as HTMLInputElement;
}

/** Fill the minimum required fields */
function fillRequiredFields(description = 'Netflix', amount = '12.99', categoryValue = 'Ocio') {
    fireEvent.change(screen.getByPlaceholderText(t('app.recurring.form.description')), {
        target: { value: description },
    });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: amount } });

    const selects = screen.getAllByRole('combobox');
    for (const s of selects) {
        const opts = Array.from(s.querySelectorAll('option')).map((o) => (o as HTMLOptionElement).value);
        if (opts.includes(categoryValue)) {
            fireEvent.change(s, { target: { value: categoryValue } });
            break;
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RuleForm — end-date radio buttons', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        currentRules = [];
    });

    test('shows both radio buttons with correct labels', () => {
        renderTab();
        openCreateForm();
        expect(getNoEndRadio()).toBeInTheDocument();
        expect(getWithEndRadio()).toBeInTheDocument();
    });

    test('"Sin fecha de fin" is checked by default', () => {
        renderTab();
        openCreateForm();
        expect(getNoEndRadio()).toBeChecked();
        expect(getWithEndRadio()).not.toBeChecked();
    });

    test('date picker is NOT rendered when "Sin fecha de fin" is selected', () => {
        renderTab();
        openCreateForm();
        expect(getEndDateInput()).toBeNull();
    });

    test('clicking "Con fecha de fin" shows the date picker', () => {
        renderTab();
        openCreateForm();
        fireEvent.click(getWithEndRadio());
        expect(getEndDateInput()).toBeInTheDocument();
        expect(getWithEndRadio()).toBeChecked();
        expect(getNoEndRadio()).not.toBeChecked();
    });

    test('clicking back to "Sin fecha de fin" hides the date picker', () => {
        renderTab();
        openCreateForm();
        fireEvent.click(getWithEndRadio());
        fireEvent.click(getNoEndRadio());
        expect(getEndDateInput()).toBeNull();
        expect(getNoEndRadio()).toBeChecked();
    });

    test('no checkbox is rendered', () => {
        renderTab();
        openCreateForm();
        expect(screen.queryByRole('checkbox')).toBeNull();
    });

    test('"Fin" label is shown', () => {
        renderTab();
        openCreateForm();
        expect(screen.getByText(t('app.recurring.form.end'))).toBeInTheDocument();
    });

    test('no hint paragraph is rendered', () => {
        renderTab();
        openCreateForm();
        expect(screen.queryByText(/Deja en blanco/)).toBeNull();
    });
});

// ── buildDto — payload sent to API ────────────────────────────────────────────

describe('RuleForm — buildDto (via form submission)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        currentRules = [];
    });

    test('sends endYear=null and endMonth=null when "Sin fecha de fin"', async () => {
        mockCreateRule.mockResolvedValue({ ...ruleNoEnd, id: 'new' });
        renderTab();
        openCreateForm();
        fillRequiredFields();

        fireEvent.click(screen.getByText(t('app.recurring.form.save')));

        await waitFor(() => expect(mockCreateRule).toHaveBeenCalled());
        const dto = mockCreateRule.mock.calls[0][0];
        expect(dto.endYear).toBeNull();
        expect(dto.endMonth).toBeNull();
    });

    test('sends correct endYear and endMonth from selected date', async () => {
        mockCreateRule.mockResolvedValue({ ...ruleWithEnd, id: 'new' });
        renderTab();
        openCreateForm();
        fillRequiredFields('Gym', '40', 'Hogar');

        fireEvent.click(getWithEndRadio());
        fireEvent.change(getEndDateInput(), { target: { value: '2027-07-01' } });

        fireEvent.click(screen.getByText(t('app.recurring.form.save')));

        await waitFor(() => expect(mockCreateRule).toHaveBeenCalled());
        const dto = mockCreateRule.mock.calls[0][0];
        expect(dto.endYear).toBe(2027);
        expect(dto.endMonth).toBe(7);
    });

    test('endYear/endMonth are null when "Con fecha de fin" selected but no date entered', async () => {
        mockCreateRule.mockResolvedValue({ ...ruleNoEnd, id: 'new' });
        renderTab();
        openCreateForm();
        fillRequiredFields();

        // Select "with end" but don't pick a date
        fireEvent.click(getWithEndRadio());
        // Leave date input empty

        fireEvent.click(screen.getByText(t('app.recurring.form.save')));

        await waitFor(() => expect(mockCreateRule).toHaveBeenCalled());
        const dto = mockCreateRule.mock.calls[0][0];
        expect(dto.endYear).toBeNull();
        expect(dto.endMonth).toBeNull();
    });

    test('sends correct description, amount, type, category, frequency and startYear/Month', async () => {
        mockCreateRule.mockResolvedValue({ ...ruleNoEnd, id: 'new' });
        renderTab();
        openCreateForm();

        fireEvent.change(screen.getByPlaceholderText(t('app.recurring.form.description')), {
            target: { value: 'Sueldo' },
        });
        fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '2000' } });

        const typeSelect = screen.getAllByRole('combobox').find((s) =>
            Array.from(s.querySelectorAll('option')).some((o) => (o as HTMLOptionElement).value === 'INCOME'),
        )!;
        fireEvent.change(typeSelect, { target: { value: 'INCOME' } });

        const categorySelect = screen.getAllByRole('combobox').find((s) =>
            Array.from(s.querySelectorAll('option')).some((o) => (o as HTMLOptionElement).value === 'Ocio'),
        )!;
        fireEvent.change(categorySelect, { target: { value: 'Ocio' } });

        const freqSelect = screen.getAllByRole('combobox').find((s) =>
            Array.from(s.querySelectorAll('option')).some((o) => (o as HTMLOptionElement).value === 'bimonthly'),
        )!;
        fireEvent.change(freqSelect, { target: { value: 'bimonthly' } });

        const startMonthSelect = screen.getAllByRole('combobox').find((s) =>
            Array.from(s.querySelectorAll('option')).some((o) => (o as HTMLOptionElement).value === '6'),
        )!;
        fireEvent.change(startMonthSelect, { target: { value: '6' } });

        const yearInputs = screen
            .getAllByRole('spinbutton')
            .filter((el) => (el as HTMLInputElement).min === '2020');
        fireEvent.change(yearInputs[0], { target: { value: '2026' } });

        fireEvent.click(screen.getByText(t('app.recurring.form.save')));

        await waitFor(() => expect(mockCreateRule).toHaveBeenCalled());
        const dto = mockCreateRule.mock.calls[0][0];
        expect(dto.description).toBe('Sueldo');
        expect(dto.amount).toBe(2000);
        expect(dto.type).toBe('INCOME');
        expect(dto.category).toBe('Ocio');
        expect(dto.frequency).toBe('bimonthly');
        expect(dto.startYear).toBe(2026);
        expect(dto.startMonth).toBe(6);
    });
});

// ── validateForm — error messages ─────────────────────────────────────────────

describe('RuleForm — validateForm (error messages)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        currentRules = [];
    });

    test('shows error when description is empty (whitespace only)', async () => {
        renderTab();
        openCreateForm();
        fillRequiredFields('  ', '10', 'Ocio');
        fireEvent.click(screen.getByText(t('app.recurring.form.save')));
        await waitFor(() =>
            expect(screen.getByText('La descripción es obligatoria')).toBeInTheDocument(),
        );
        expect(mockCreateRule).not.toHaveBeenCalled();
    });

    test('shows error when amount is zero', async () => {
        renderTab();
        openCreateForm();

        fireEvent.change(screen.getByPlaceholderText(t('app.recurring.form.description')), { target: { value: 'Test' } });
        fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '0' } });
        const selects = screen.getAllByRole('combobox');
        for (const s of selects) {
            const opts = Array.from(s.querySelectorAll('option')).map((o) => (o as HTMLOptionElement).value);
            if (opts.includes('Ocio')) { fireEvent.change(s, { target: { value: 'Ocio' } }); break; }
        }
        fireEvent.click(screen.getByText(t('app.recurring.form.save')));
        await waitFor(() =>
            expect(screen.getByText('El importe debe ser un número positivo')).toBeInTheDocument(),
        );
    });

    test('shows error when amount is negative', async () => {
        renderTab();
        openCreateForm();
        fillRequiredFields('Test', '-5', 'Ocio');
        fireEvent.click(screen.getByText(t('app.recurring.form.save')));
        await waitFor(() =>
            expect(screen.getByText('El importe debe ser un número positivo')).toBeInTheDocument(),
        );
    });

    test('shows error when category is not selected', async () => {
        renderTab();
        openCreateForm();
        fireEvent.change(screen.getByPlaceholderText(t('app.recurring.form.description')), { target: { value: 'Test' } });
        fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
        // Leave category as "" (default "—")
        fireEvent.click(screen.getByText(t('app.recurring.form.save')));
        await waitFor(() =>
            expect(screen.getByText('Selecciona una categoría')).toBeInTheDocument(),
        );
        expect(mockCreateRule).not.toHaveBeenCalled();
    });

    test('shows error returned by createRule (API error)', async () => {
        mockCreateRule.mockRejectedValue(new Error('Duplicate rule'));
        renderTab();
        openCreateForm();
        fillRequiredFields();
        fireEvent.click(screen.getByText(t('app.recurring.form.save')));
        await waitFor(() =>
            expect(screen.getByText('Duplicate rule')).toBeInTheDocument(),
        );
    });

    test('shows generic error when createRule throws non-Error', async () => {
        mockCreateRule.mockRejectedValue('oops');
        renderTab();
        openCreateForm();
        fillRequiredFields();
        fireEvent.click(screen.getByText(t('app.recurring.form.save')));
        await waitFor(() =>
            expect(screen.getByText('Error al guardar')).toBeInTheDocument(),
        );
    });
});

// ── ruleToForm — editing pre-populates the form ───────────────────────────────

describe('RuleForm — ruleToForm (edit mode pre-population)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('pre-populates fields when editing a rule with no end date — noend radio checked', () => {
        currentRules = [ruleNoEnd];
        renderTab();
        fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.edit')) }));

        expect(
            (screen.getByPlaceholderText(t('app.recurring.form.description')) as HTMLInputElement).value,
        ).toBe('Netflix');
        expect((screen.getByPlaceholderText('0.00') as HTMLInputElement).value).toBe('12.99');
        expect(getNoEndRadio()).toBeChecked();
        expect(getEndDateInput()).toBeNull();
    });

    test('pre-populates date picker when editing a rule with end date', () => {
        currentRules = [ruleWithEnd];
        renderTab();
        fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.edit')) }));

        expect(getWithEndRadio()).toBeChecked();
        const dateInput = getEndDateInput();
        expect(dateInput).toBeInTheDocument();
        // ruleWithEnd has endYear=2026, endMonth=7 → formatted as 2026-07-01
        expect(dateInput!.value).toBe('2026-07-01');
    });

    test('edit form shows correct title', () => {
        currentRules = [ruleNoEnd];
        renderTab();
        fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.edit')) }));
        expect(screen.getByText(t('app.recurring.form.title.edit'))).toBeInTheDocument();
    });

    test('create form shows correct title', () => {
        currentRules = [];
        renderTab();
        openCreateForm();
        expect(screen.getByText(t('app.recurring.form.title.create'))).toBeInTheDocument();
    });

    test('cancel button closes the form', () => {
        currentRules = [];
        renderTab();
        openCreateForm();
        fireEvent.click(screen.getByText(t('app.recurring.form.cancel')));
        expect(screen.queryByText(t('app.recurring.form.title.create'))).toBeNull();
    });

    test('saving spinner shows while submitting', async () => {
        let resolveCreate!: () => void;
        mockCreateRule.mockReturnValue(new Promise((res) => { resolveCreate = () => res(ruleNoEnd); }));
        renderTab();
        openCreateForm();
        fillRequiredFields();
        fireEvent.click(screen.getByText(t('app.recurring.form.save')));
        expect(screen.getByText(t('app.recurring.form.saving'))).toBeInTheDocument();
        resolveCreate();
        await waitFor(() => expect(screen.queryByText(t('app.recurring.form.saving'))).toBeNull());
    });

    test('updateRule called with correct id and dto when editing', async () => {
        currentRules = [ruleNoEnd];
        mockUpdateRule.mockResolvedValue({ ...ruleNoEnd, description: 'Netflix Premium' });
        renderTab();
        fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.edit')) }));
        fireEvent.change(screen.getByPlaceholderText(t('app.recurring.form.description')), {
            target: { value: 'Netflix Premium' },
        });
        fireEvent.click(screen.getByText(t('app.recurring.form.save')));
        await waitFor(() => expect(mockUpdateRule).toHaveBeenCalledWith(
            ruleNoEnd.id,
            expect.objectContaining({ description: 'Netflix Premium' }),
        ));
    });

    test('after successful edit calls refresh and closes form', async () => {
        currentRules = [ruleNoEnd];
        mockUpdateRule.mockResolvedValue(ruleNoEnd);
        renderTab();
        fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.edit')) }));
        fireEvent.click(screen.getByText(t('app.recurring.form.save')));
        await waitFor(() => expect(mockRefresh).toHaveBeenCalledWith({ invalidate: true }));
        expect(screen.queryByText(t('app.recurring.form.title.edit'))).toBeNull();
    });
});

// ── Additional coverage ───────────────────────────────────────────────────────

describe('RuleForm — additional coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        currentRules = [];
    });

    test('changing start year updates the dto startYear', async () => {
        mockCreateRule.mockResolvedValue({ ...ruleNoEnd, id: 'new' });
        renderTab();
        openCreateForm();
        fillRequiredFields();
        const yearInputs = screen
            .getAllByRole('spinbutton')
            .filter((el) => (el as HTMLInputElement).min === '2020');
        fireEvent.change(yearInputs[0], { target: { value: '2025' } });
        fireEvent.click(screen.getByText(t('app.recurring.form.save')));
        await waitFor(() => expect(mockCreateRule).toHaveBeenCalled());
        expect(mockCreateRule.mock.calls[0][0].startYear).toBe(2025);
    });

    test('RuleCard shows "Activar" button when rule is inactive', () => {
        currentRules = [{ ...ruleNoEnd, active: false }];
        renderTab();
        expect(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.activate')) })).toBeInTheDocument();
    });

    test('RuleCard "Activar" button calls toggleActive with true', async () => {
        mockToggleActive.mockResolvedValue(undefined);
        currentRules = [{ ...ruleNoEnd, active: false }];
        renderTab();
        fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.activate')) }));
        await waitFor(() => expect(mockToggleActive).toHaveBeenCalledWith(ruleNoEnd.id, true));
    });

    test('delete modal catch branch: closes modal when deleteRule throws', async () => {
        mockDeleteRule.mockRejectedValue(new Error('Network error'));
        currentRules = [ruleNoEnd];
        renderTab();
        fireEvent.click(screen.getByRole('button', { name: new RegExp(t('app.recurring.card.delete')) }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        fireEvent.click(screen.getByText(t('app.recurring.delete.confirm')));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(mockRefresh).not.toHaveBeenCalled();
    });
});
