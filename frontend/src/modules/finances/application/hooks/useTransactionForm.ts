import { useEffect, useState } from 'react';
import type { CreateTransactionDTO, TransactionType } from '@modules/finances/domain/types';
import { useAction } from '@shared/hooks/useAction';
import { isPositiveAmount, parseDecimal } from '@shared/utils/numbers';

export interface TransactionFields {
  description: string;
  amount: string;
  type: TransactionType;
  category: string;
  date: string;
  notes: string;
  accountId: string | null;
}

interface Options {
  /** Money available (carry-over + month balance): a saving cannot exceed it. */
  availableBalance: number;
  onSubmit: (dto: CreateTransactionDTO) => Promise<void>;
  /** Date preselected for new movements (inside the viewed period). */
  defaultDate: string;
  /** Account preselected for new movements. */
  defaultAccountId?: string | null;
  formatMoney: (amount: number) => string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Editing an existing movement: the form starts with its values and is never reset. */
  initialValues?: TransactionFields;
}

/** Value of the category select that opens the category manager. */
export const MANAGE_CATEGORIES = '__manage__';

export function useTransactionForm({
  availableBalance,
  onSubmit,
  defaultDate,
  defaultAccountId = null,
  formatMoney,
  t,
  initialValues,
}: Options) {
  const blank = (): TransactionFields => ({
    description: '',
    amount: '',
    type: 'EXPENSE',
    category: '',
    date: defaultDate,
    notes: '',
    accountId: defaultAccountId,
  });
  const [fields, setFields] = useState<TransactionFields>(() => initialValues ?? blank());
  const action = useAction(t('app.transaction.form.error'));
  const { setError } = action;

  const set = <K extends keyof TransactionFields>(key: K, value: TransactionFields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  // A new movement follows the viewed month (each month has its own default date).
  useEffect(() => {
    if (initialValues) return;
    setFields((f) => ({ ...f, date: defaultDate }));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDate]);

  // Accounts arrive after the first render: preselect the default one once known.
  useEffect(() => {
    if (initialValues || !defaultAccountId) return;
    setFields((f) => (f.accountId ? f : { ...f, accountId: defaultAccountId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAccountId]);

  const handleCategoryChange = (value: string, onManageCategories: () => void) => {
    if (value === MANAGE_CATEGORIES) onManageCategories();
    else set('category', value);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    const amount = parseDecimal(fields.amount);
    const description = fields.description.trim();
    if (!description || !fields.category || !isPositiveAmount(amount)) {
      setError(t('app.transaction.form.required'));
      return false;
    }
    if (fields.type === 'SAVING' && amount > availableBalance) {
      setError(t('app.transaction.form.insufficient', { amount: formatMoney(availableBalance) }));
      return false;
    }
    const saved = await action.run(() =>
      onSubmit({
        description,
        amount,
        type: fields.type,
        category: fields.category,
        date: fields.date,
        notes: fields.notes.trim() || null,
        accountId: fields.accountId,
      })
    );
    if (saved && !initialValues) setFields(blank());
    return saved;
  };

  return {
    fields,
    setDescription: (v: string) => set('description', v),
    setAmount: (v: string) => set('amount', v),
    setType: (v: TransactionType) => set('type', v),
    setDate: (v: string) => set('date', v),
    setNotes: (v: string) => set('notes', v),
    setAccountId: (v: string | null) => set('accountId', v),
    handleCategoryChange,
    handleSubmit,
    reset: () => {
      setFields(initialValues ?? blank());
      setError(null);
    },
    loading: action.pending,
    error: action.error,
  };
}

export type UseTransactionFormReturn = ReturnType<typeof useTransactionForm>;
