import { useState } from 'react';
import { useAction } from '@shared/hooks/useAction';
import type {
  CreateRecurringRuleDTO,
  RecurringRule,
  UpdateRecurringRuleDTO,
} from '@modules/finances/domain/types';
import {
  emptyRuleForm,
  ruleToForm,
  validateRuleForm,
  type RuleFormState,
} from '@modules/finances/domain/recurringForm';

interface Options {
  onCreateRule: (dto: CreateRecurringRuleDTO) => Promise<RecurringRule>;
  onUpdateRule: (id: string, dto: UpdateRecurringRuleDTO) => Promise<RecurringRule>;
  /** Runs after a successful save (e.g. reload the month, which may have new movements). */
  onAfterSave?: () => Promise<void>;
}

/** Create / edit form of a recurring rule. `formError` is an i18n key or an API message. */
export function useRecurringRuleForm({ onCreateRule, onUpdateRule, onAfterSave }: Options) {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [form, setForm] = useState<RuleFormState>(emptyRuleForm);
  const action = useAction('Error al guardar');

  const open = (rule: RecurringRule | null) => {
    setEditingRule(rule);
    setForm(rule ? ruleToForm(rule) : emptyRuleForm());
    action.setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRule(null);
  };

  const handleSubmit = async () => {
    const result = validateRuleForm(form);
    if ('error' in result) {
      action.setError(result.error);
      return;
    }
    const saved = await action.run(async () => {
      if (editingRule) await onUpdateRule(editingRule.id, result.dto);
      else await onCreateRule(result.dto);
      await onAfterSave?.();
    });
    if (saved) closeForm();
  };

  return {
    showForm,
    editingRule,
    form,
    formError: action.error,
    saving: action.pending,
    setForm,
    openCreate: () => open(null),
    openEdit: (rule: RecurringRule) => open(rule),
    closeForm,
    handleSubmit,
  };
}
