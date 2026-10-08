import type {
  CreateRecurringRuleDTO,
  RecurringFrequency,
  RecurringRule,
  TransactionType,
} from './types';
import { parseDecimal, isPositiveAmount } from '@shared/utils/numbers';

export const FREQUENCIES: RecurringFrequency[] = ['monthly', 'bimonthly', 'quarterly', 'yearly'];

export interface RuleFormState {
  description: string;
  amount: string;
  type: TransactionType;
  category: string;
  frequency: RecurringFrequency;
  /** YYYY-MM-DD (only year and month are used). */
  startDate: string;
  hasEnd: boolean;
  endDate: string;
}

const firstDay = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-01`;

/** A new rule starts on the first day of the current month. */
export function emptyRuleForm(today = new Date()): RuleFormState {
  return {
    description: '',
    amount: '',
    type: 'EXPENSE',
    category: '',
    frequency: 'monthly',
    startDate: firstDay(today.getFullYear(), today.getMonth() + 1),
    hasEnd: false,
    endDate: '',
  };
}

export function ruleToForm(rule: RecurringRule): RuleFormState {
  const hasEnd = rule.endYear !== null && rule.endMonth !== null;
  return {
    description: rule.description,
    amount: String(rule.amount),
    type: rule.type,
    category: rule.category,
    frequency: rule.frequency,
    startDate: firstDay(rule.startYear, rule.startMonth),
    hasEnd,
    endDate: hasEnd ? firstDay(rule.endYear as number, rule.endMonth as number) : '',
  };
}

const yearMonth = (date: string): [number, number] => {
  const [y, m] = date.split('-').map(Number);
  return [y, m];
};

/** i18n key of the first problem of the form, or null. */
function ruleFormError(form: RuleFormState, amount: number): string | null {
  if (!form.description.trim()) return 'app.recurring.error.description';
  if (!isPositiveAmount(amount)) return 'app.recurring.error.amount';
  if (!form.category) return 'app.recurring.error.category';
  if (!form.startDate) return 'app.recurring.error.start';
  return null;
}

/** i18n key of the first problem of the form, or the DTO to send. */
export function validateRuleForm(
  form: RuleFormState
): { error: string } | { dto: CreateRecurringRuleDTO } {
  const amount = parseDecimal(form.amount);
  const error = ruleFormError(form, amount);
  if (error) return { error };
  const [startYear, startMonth] = yearMonth(form.startDate);
  const end = form.hasEnd && form.endDate ? yearMonth(form.endDate) : null;
  if (end && end[0] * 12 + end[1] < startYear * 12 + startMonth) {
    return { error: 'app.recurring.error.end' };
  }
  return {
    dto: {
      description: form.description.trim(),
      amount,
      type: form.type,
      category: form.category,
      frequency: form.frequency,
      startYear,
      startMonth,
      endYear: end ? end[0] : null,
      endMonth: end ? end[1] : null,
    },
  };
}
