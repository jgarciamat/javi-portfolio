import { randomUUID } from 'crypto';
import { ValidationError } from '@domain/errors';
import { Cents, assertPositiveCents } from '@domain/shared/money';
import { Period, periodOfDate, toDateOnly } from '@domain/shared/period';
import { normalizeText } from '@domain/shared/text';
import { TransactionType, parseTransactionType } from './TransactionType';

export const DESCRIPTION_MAX = 200;
export const NOTES_MAX = 1000;

export interface TransactionProps {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  description: string;
  amountCents: Cents;
  type: TransactionType;
  /** Calendar date, YYYY-MM-DD. */
  date: string;
  /** Budgeting period the date falls in (depends on the user's month start day). */
  period: Period;
  notes: string | null;
  recurringRuleId: string | null;
  importHash: string | null;
  createdAt: string;
}

export interface NewTransaction {
  userId: string;
  accountId: string;
  categoryId: string;
  description: string;
  amountCents: Cents;
  type: TransactionType | string;
  date: string;
  notes?: string | null;
  recurringRuleId?: string | null;
  importHash?: string | null;
}

export type TransactionChanges = Partial<
  Pick<
    NewTransaction,
    'accountId' | 'categoryId' | 'description' | 'amountCents' | 'type' | 'date' | 'notes'
  >
>;

function cleanDescription(value: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed)
    throw new ValidationError('La descripción no puede estar vacía', 'INVALID_DESCRIPTION');
  if (trimmed.length > DESCRIPTION_MAX) {
    throw new ValidationError(`La descripción no puede superar ${DESCRIPTION_MAX} caracteres`);
  }
  return trimmed;
}

function cleanNotes(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  if (trimmed.length > NOTES_MAX) {
    throw new ValidationError(`Las notas no pueden superar ${NOTES_MAX} caracteres`);
  }
  return trimmed;
}

export class Transaction {
  private constructor(private readonly props: TransactionProps) {}

  static create(input: NewTransaction, monthStartDay: number, now = new Date()): Transaction {
    assertPositiveCents(input.amountCents);
    const date = toDateOnly(input.date);
    return new Transaction({
      id: randomUUID(),
      userId: input.userId,
      accountId: input.accountId,
      categoryId: input.categoryId,
      description: cleanDescription(input.description),
      amountCents: input.amountCents,
      type: parseTransactionType(input.type),
      date,
      period: periodOfDate(date, monthStartDay),
      notes: cleanNotes(input.notes),
      recurringRuleId: input.recurringRuleId ?? null,
      importHash: input.importHash ?? null,
      createdAt: now.toISOString(),
    });
  }

  static reconstitute(props: TransactionProps): Transaction {
    return new Transaction({ ...props });
  }

  update(changes: TransactionChanges, monthStartDay: number): Transaction {
    const next: TransactionProps = { ...this.props };
    if (changes.accountId !== undefined) next.accountId = changes.accountId;
    if (changes.categoryId !== undefined) next.categoryId = changes.categoryId;
    if (changes.description !== undefined) next.description = cleanDescription(changes.description);
    if (changes.amountCents !== undefined) {
      assertPositiveCents(changes.amountCents);
      next.amountCents = changes.amountCents;
    }
    if (changes.type !== undefined) next.type = parseTransactionType(changes.type);
    if (changes.date !== undefined) next.date = toDateOnly(changes.date);
    if (changes.notes !== undefined) next.notes = cleanNotes(changes.notes);
    next.period = periodOfDate(next.date, monthStartDay);
    return new Transaction(next);
  }

  /** Turns a generated movement into a regular one (e.g. after moving it to another month). */
  detachFromRule(): Transaction {
    return new Transaction({ ...this.props, recurringRuleId: null });
  }

  /** Recomputes the period after the user changes the month start day. */
  withPeriodFor(monthStartDay: number): Transaction {
    return new Transaction({ ...this.props, period: periodOfDate(this.props.date, monthStartDay) });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get accountId(): string {
    return this.props.accountId;
  }
  get categoryId(): string {
    return this.props.categoryId;
  }
  get description(): string {
    return this.props.description;
  }
  /** Normalised description used to learn categories from history. */
  get descriptionKey(): string {
    return normalizeText(this.props.description);
  }
  get amountCents(): Cents {
    return this.props.amountCents;
  }
  get type(): TransactionType {
    return this.props.type;
  }
  get date(): string {
    return this.props.date;
  }
  get period(): Period {
    return this.props.period;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get recurringRuleId(): string | null {
    return this.props.recurringRuleId;
  }
  get importHash(): string | null {
    return this.props.importHash;
  }
  get createdAt(): string {
    return this.props.createdAt;
  }

  toPrimitives(): TransactionProps {
    return { ...this.props, period: { ...this.props.period } };
  }
}
