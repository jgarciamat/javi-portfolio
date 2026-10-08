import { useState } from 'react';
import { useAction } from '@shared/hooks/useAction';
import { parseDecimal } from '@shared/utils/numbers';
import type {
  CreateCustomAlertDTO,
  CustomAlert,
  CustomAlertMetric,
  CustomAlertOperator,
} from '@modules/finances/domain/types';
import { isCategoryMetric } from '@modules/finances/domain/customAlerts';

export interface AlertFormState {
  name: string;
  color: string;
  byCategory: boolean;
  category: string;
  metric: CustomAlertMetric;
  operator: CustomAlertOperator;
  threshold: string;
}

export const DEFAULT_ALERT_COLOR = '#6366f1';

export const EMPTY_ALERT_FORM: AlertFormState = {
  name: '',
  color: DEFAULT_ALERT_COLOR,
  byCategory: false,
  category: '',
  metric: 'expenses_pct',
  operator: 'gte',
  threshold: '',
};

export function alertToForm(alert: CustomAlert): AlertFormState {
  return {
    name: alert.name,
    color: alert.color || DEFAULT_ALERT_COLOR,
    byCategory: isCategoryMetric(alert.metric),
    category: alert.category ?? '',
    metric: alert.metric,
    operator: alert.operator,
    threshold: String(alert.threshold),
  };
}

/** i18n key of the first problem of the form, or the DTO to send. */
export function validateAlertForm(
  form: AlertFormState
): { error: string } | { dto: CreateCustomAlertDTO } {
  const threshold = parseDecimal(form.threshold);
  if (!form.name.trim()) return { error: 'app.customAlerts.error.nameRequired' };
  if (!Number.isFinite(threshold) || threshold < 0) {
    return { error: 'app.customAlerts.error.thresholdInvalid' };
  }
  if (form.byCategory && !form.category)
    return { error: 'app.customAlerts.error.categoryRequired' };
  return {
    dto: {
      name: form.name.trim(),
      metric: form.metric,
      operator: form.operator,
      threshold,
      category: form.byCategory ? form.category : null,
      color: form.color,
    },
  };
}

/** Switching between global and per-category alerts resets the metric of the group. */
export function withCategoryMode(form: AlertFormState, byCategory: boolean): AlertFormState {
  return {
    ...form,
    byCategory,
    metric: byCategory ? 'category_pct' : 'expenses_pct',
    category: byCategory ? form.category : '',
  };
}

/** Create / edit form of a custom alert. Errors are i18n keys or API messages. */
export function useAlertForm(
  createAlert: (dto: CreateCustomAlertDTO) => Promise<unknown>,
  updateAlert: (id: string, dto: CreateCustomAlertDTO) => Promise<unknown>
) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomAlert | null>(null);
  const [form, setForm] = useState<AlertFormState>(EMPTY_ALERT_FORM);
  const action = useAction();

  const show = (alert: CustomAlert | null) => {
    setEditing(alert);
    setForm(alert ? alertToForm(alert) : EMPTY_ALERT_FORM);
    action.setError(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
    setForm(EMPTY_ALERT_FORM);
    action.setError(null);
  };

  const submit = async () => {
    const result = validateAlertForm(form);
    if ('error' in result) {
      action.setError(result.error);
      return;
    }
    const saved = await action.run(() =>
      editing ? updateAlert(editing.id, result.dto) : createAlert(result.dto)
    );
    if (saved) close();
  };

  return {
    open,
    editing,
    form,
    setForm,
    saving: action.pending,
    error: action.error,
    openCreate: () => show(null),
    openEdit: (alert: CustomAlert) => show(alert),
    close,
    submit,
  };
}
