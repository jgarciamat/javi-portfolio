import { randomUUID } from 'crypto';
import { ValidationError } from '@domain/errors';
import { isHexColor } from '@domain/shared/text';

export const CUSTOM_ALERT_METRICS = [
  'expenses_pct', // expenses as % of available money (carry-over + income)
  'income_pct', // income as % of carry-over
  'saving_pct', // saving as % of income
  'balance_pct', // balance as % of available money
  'balance_amount', // balance in absolute amount
  'category_pct', // expenses of a category as % of available money
  'category_amount', // expenses of a category in absolute amount
] as const;
export type CustomAlertMetric = (typeof CUSTOM_ALERT_METRICS)[number];

export const CUSTOM_ALERT_OPERATORS = ['gte', 'lte'] as const;
export type CustomAlertOperator = (typeof CUSTOM_ALERT_OPERATORS)[number];

export interface CustomAlertProps {
  id: string;
  userId: string;
  name: string;
  metric: CustomAlertMetric;
  operator: CustomAlertOperator;
  threshold: number;
  categoryId: string | null;
  color: string;
  active: boolean;
  createdAt: string;
}

export type CustomAlertInput = Partial<
  Pick<CustomAlertProps, 'name' | 'threshold' | 'categoryId' | 'color' | 'active'>
> & { metric?: string; operator?: string };

export function metricNeedsCategory(metric: CustomAlertMetric): boolean {
  return metric === 'category_pct' || metric === 'category_amount';
}

function validate(props: CustomAlertProps): CustomAlertProps {
  const name = (props.name ?? '').trim();
  if (!name) throw new ValidationError('El nombre de la alerta no puede estar vacío');
  if (name.length > 80) throw new ValidationError('Nombre demasiado largo');
  if (!CUSTOM_ALERT_METRICS.includes(props.metric)) {
    throw new ValidationError(`Métrica inválida. Debe ser ${CUSTOM_ALERT_METRICS.join(', ')}`);
  }
  if (!CUSTOM_ALERT_OPERATORS.includes(props.operator)) {
    throw new ValidationError('Operador inválido. Debe ser gte o lte');
  }
  if (typeof props.threshold !== 'number' || !Number.isFinite(props.threshold)) {
    throw new ValidationError('El umbral debe ser un número');
  }
  if (props.threshold < 0 && props.metric !== 'balance_amount') {
    throw new ValidationError('El umbral no puede ser negativo');
  }
  const needsCategory = metricNeedsCategory(props.metric);
  if (needsCategory && !props.categoryId) {
    throw new ValidationError('Esta métrica necesita una categoría');
  }
  if (!isHexColor(props.color)) throw new ValidationError('Color inválido (formato #rrggbb)');
  return { ...props, name, categoryId: needsCategory ? props.categoryId : null };
}

export class CustomAlert {
  private constructor(private readonly props: CustomAlertProps) {}

  static create(userId: string, input: CustomAlertInput, now = new Date()): CustomAlert {
    return new CustomAlert(
      validate({
        id: randomUUID(),
        userId,
        name: input.name ?? '',
        metric: input.metric as CustomAlertMetric,
        operator: input.operator as CustomAlertOperator,
        threshold: input.threshold as number,
        categoryId: input.categoryId ?? null,
        color: input.color ?? '#6366f1',
        active: input.active ?? true,
        createdAt: now.toISOString(),
      })
    );
  }

  static reconstitute(props: CustomAlertProps): CustomAlert {
    return new CustomAlert({ ...props });
  }

  update(changes: CustomAlertInput): CustomAlert {
    const next = { ...this.props };
    if (changes.name !== undefined) next.name = changes.name;
    if (changes.metric !== undefined) next.metric = changes.metric as CustomAlertMetric;
    if (changes.operator !== undefined) next.operator = changes.operator as CustomAlertOperator;
    if (changes.threshold !== undefined) next.threshold = changes.threshold;
    if (changes.categoryId !== undefined) next.categoryId = changes.categoryId;
    if (changes.color !== undefined) next.color = changes.color;
    if (changes.active !== undefined) next.active = changes.active;
    return new CustomAlert(validate(next));
  }

  get id(): string {
    return this.props.id;
  }
  get categoryId(): string | null {
    return this.props.categoryId;
  }

  toPrimitives(): CustomAlertProps {
    return { ...this.props };
  }
}
