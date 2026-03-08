import type { RecurringRule, CreateRecurringRuleDTO, RecurringFrequency, TransactionType } from '@modules/finances/domain/types';

// ─── Form state ───────────────────────────────────────────────────────────────

export interface FormState {
    description: string;
    amount: string;
    type: TransactionType;
    category: string;
    frequency: RecurringFrequency;
    /** ISO date string YYYY-MM-DD used by the native date picker */
    startDate: string;
    hasEnd: boolean;
    /** ISO date string YYYY-MM-DD used by the native date picker */
    endDate: string;
}

const now = new Date();

export const EMPTY_FORM: FormState = {
    description: '',
    amount: '',
    type: 'EXPENSE',
    category: '',
    frequency: 'monthly',
    startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    hasEnd: false,
    endDate: '',
};

// ─── Type badge CSS class map ─────────────────────────────────────────────────

export const TYPE_CLASS: Record<TransactionType, string> = {
    INCOME: 'recurring-type--income',
    EXPENSE: 'recurring-type--expense',
    SAVING: 'recurring-type--saving',
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Converts a persisted RecurringRule to the editable FormState */
export function ruleToForm(rule: RecurringRule): FormState {
    const endDate =
        rule.endYear !== null && rule.endMonth !== null
            ? `${rule.endYear}-${String(rule.endMonth).padStart(2, '0')}-01`
            : '';
    const startDate = `${rule.startYear}-${String(rule.startMonth).padStart(2, '0')}-01`;
    return {
        description: rule.description,
        amount: String(rule.amount),
        type: rule.type,
        category: rule.category,
        frequency: rule.frequency,
        startDate,
        hasEnd: rule.endYear !== null,
        endDate,
    };
}

/** Returns a validation error message or null if the form is valid */
export function validateRecurringForm(form: FormState, amount: number): string | null {
    if (!form.description.trim()) return 'La descripción es obligatoria';
    if (isNaN(amount) || amount <= 0) return 'El importe debe ser un número positivo';
    if (!form.category) return 'Selecciona una categoría';
    return null;
}

/** Builds a CreateRecurringRuleDTO from the form state */
export function buildRecurringDto(form: FormState, amount: number): CreateRecurringRuleDTO {
    let endYear: number | null = null;
    let endMonth: number | null = null;
    if (form.hasEnd && form.endDate) {
        const [y, m] = form.endDate.split('-').map(Number);
        endYear = y;
        endMonth = m;
    }
    const [sy, sm] = form.startDate
        ? form.startDate.split('-').map(Number)
        : [now.getFullYear(), now.getMonth() + 1];
    return {
        description: form.description.trim(),
        amount,
        type: form.type,
        category: form.category,
        frequency: form.frequency,
        startYear: sy,
        startMonth: sm,
        endYear,
        endMonth,
    };
}
