import { useState } from 'react';
import {
    EMPTY_FORM,
    ruleToForm,
    validateRecurringForm,
    buildRecurringDto,
} from '../../ui/types/RecurringRulesTab.types';
import type { FormState } from '../../ui/types/RecurringRulesTab.types';
import type { RecurringRule, CreateRecurringRuleDTO, UpdateRecurringRuleDTO } from '@modules/finances/domain/types';

interface UseRecurringRuleFormOptions {
    onCreateRule: (dto: CreateRecurringRuleDTO) => Promise<RecurringRule>;
    onUpdateRule: (id: string, dto: UpdateRecurringRuleDTO) => Promise<RecurringRule>;
    onAfterSave?: () => Promise<void>;
}

export interface UseRecurringRuleFormReturn {
    showForm: boolean;
    editingRule: RecurringRule | null;
    form: FormState;
    formError: string | null;
    saving: boolean;
    setForm: (f: FormState) => void;
    openCreate: () => void;
    openEdit: (rule: RecurringRule) => void;
    closeForm: () => void;
    handleSubmit: () => Promise<void>;
}

export function useRecurringRuleForm({
    onCreateRule,
    onUpdateRule,
    onAfterSave,
}: UseRecurringRuleFormOptions): UseRecurringRuleFormReturn {
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const openCreate = () => {
        setEditingRule(null);
        setForm(EMPTY_FORM);
        setFormError(null);
        setShowForm(true);
    };

    const openEdit = (rule: RecurringRule) => {
        setEditingRule(rule);
        setForm(ruleToForm(rule));
        setFormError(null);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingRule(null);
    };

    const handleSubmit = async () => {
        const amount = parseFloat(form.amount);
        const validationError = validateRecurringForm(form, amount);
        if (validationError) { setFormError(validationError); return; }

        const dto = buildRecurringDto(form, amount);

        setSaving(true);
        setFormError(null);
        try {
            if (editingRule) {
                await onUpdateRule(editingRule.id, dto as UpdateRecurringRuleDTO);
            } else {
                await onCreateRule(dto);
            }
            await onAfterSave?.();
            closeForm();
        } catch (e) {
            setFormError(e instanceof Error ? e.message : 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    return { showForm, editingRule, form, formError, saving, setForm, openCreate, openEdit, closeForm, handleSubmit };
}
