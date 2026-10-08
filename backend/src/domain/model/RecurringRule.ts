import { randomUUID } from 'crypto';
import { ValidationError } from '@domain/errors';
import { Cents, assertPositiveCents } from '@domain/shared/money';
import {
  Period,
  assertValidPeriod,
  comparePeriods,
  periodFromOrdinal,
  periodOrdinal,
} from '@domain/shared/period';
import { TransactionType, parseTransactionType } from './TransactionType';

export const RECURRING_FREQUENCIES = ['monthly', 'bimonthly', 'quarterly', 'yearly'] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

const STEP: Record<RecurringFrequency, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  yearly: 12,
};

export interface RecurringRuleProps {
  id: string;
  userId: string;
  description: string;
  amountCents: Cents;
  type: TransactionType;
  categoryId: string;
  accountId: string | null;
  start: Period;
  end: Period | null;
  frequency: RecurringFrequency;
  active: boolean;
  createdAt: string;
}

export interface RecurringRuleInput {
  description: string;
  amountCents: Cents;
  type: string;
  categoryId: string;
  accountId?: string | null;
  start: Period;
  end?: Period | null;
  frequency?: string;
  active?: boolean;
}

function validate(props: RecurringRuleProps): RecurringRuleProps {
  const description = props.description.trim();
  if (!description) throw new ValidationError('La descripción no puede estar vacía');
  if (description.length > 200) throw new ValidationError('Descripción demasiado larga');
  assertPositiveCents(props.amountCents);
  assertValidPeriod(props.start);
  if (props.end) {
    assertValidPeriod(props.end);
    if (comparePeriods(props.end, props.start) < 0) {
      throw new ValidationError(
        'La fecha de fin no puede ser anterior a la de inicio',
        'INVALID_RANGE'
      );
    }
  }
  if (!RECURRING_FREQUENCIES.includes(props.frequency)) {
    throw new ValidationError(`Frecuencia inválida. Debe ser ${RECURRING_FREQUENCIES.join(', ')}`);
  }
  return { ...props, description, type: parseTransactionType(props.type) };
}

export class RecurringRule {
  private constructor(private readonly props: RecurringRuleProps) {}

  static create(userId: string, input: RecurringRuleInput, now = new Date()): RecurringRule {
    return new RecurringRule(
      validate({
        id: randomUUID(),
        userId,
        description: input.description,
        amountCents: input.amountCents,
        type: input.type as TransactionType,
        categoryId: input.categoryId,
        accountId: input.accountId ?? null,
        start: input.start,
        end: input.end ?? null,
        frequency: (input.frequency ?? 'monthly') as RecurringFrequency,
        active: input.active ?? true,
        createdAt: now.toISOString(),
      })
    );
  }

  static reconstitute(props: RecurringRuleProps): RecurringRule {
    return new RecurringRule({ ...props });
  }

  /** Returns a validated copy with the changes applied (the stored rule is never half-valid). */
  update(changes: Partial<RecurringRuleInput>): RecurringRule {
    const next: RecurringRuleProps = { ...this.props };
    if (changes.description !== undefined) next.description = changes.description;
    if (changes.amountCents !== undefined) next.amountCents = changes.amountCents;
    if (changes.type !== undefined) next.type = changes.type as TransactionType;
    if (changes.categoryId !== undefined) next.categoryId = changes.categoryId;
    if (changes.accountId !== undefined) next.accountId = changes.accountId;
    if (changes.start !== undefined) next.start = changes.start;
    if (changes.end !== undefined) next.end = changes.end;
    if (changes.frequency !== undefined) next.frequency = changes.frequency as RecurringFrequency;
    if (changes.active !== undefined) next.active = changes.active;
    return new RecurringRule(validate(next));
  }

  /** True if the rule generates a movement in the given period. */
  appliesTo(p: Period): boolean {
    if (!this.props.active) return false;
    const target = periodOrdinal(p);
    const start = periodOrdinal(this.props.start);
    if (target < start) return false;
    if (this.props.end && target > periodOrdinal(this.props.end)) return false;
    return (target - start) % STEP[this.props.frequency] === 0;
  }

  /** Periods in [from, to] where the rule generates a movement. */
  periodsWithin(from: Period, to: Period): Period[] {
    const result: Period[] = [];
    const first = Math.max(periodOrdinal(from), periodOrdinal(this.props.start));
    const last = this.props.end
      ? Math.min(periodOrdinal(to), periodOrdinal(this.props.end))
      : periodOrdinal(to);
    for (let o = first; o <= last; o++) {
      const p = periodFromOrdinal(o);
      if (this.appliesTo(p)) result.push(p);
    }
    return result;
  }

  /** Whether a change affects the content of the movements already generated. */
  static contentChanged(before: RecurringRule, after: RecurringRule): boolean {
    const a = before.props;
    const b = after.props;
    return (
      a.description !== b.description ||
      a.amountCents !== b.amountCents ||
      a.type !== b.type ||
      a.categoryId !== b.categoryId ||
      a.accountId !== b.accountId
    );
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get description(): string {
    return this.props.description;
  }
  get amountCents(): Cents {
    return this.props.amountCents;
  }
  get type(): TransactionType {
    return this.props.type;
  }
  get categoryId(): string {
    return this.props.categoryId;
  }
  get accountId(): string | null {
    return this.props.accountId;
  }
  get start(): Period {
    return this.props.start;
  }
  get end(): Period | null {
    return this.props.end;
  }
  get frequency(): RecurringFrequency {
    return this.props.frequency;
  }
  get active(): boolean {
    return this.props.active;
  }

  toPrimitives(): RecurringRuleProps {
    return { ...this.props };
  }
}
