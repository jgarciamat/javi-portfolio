import { randomUUID } from 'crypto';
import { ValidationError } from '@domain/errors';
import { Cents } from '@domain/shared/money';
import { isHexColor } from '@domain/shared/text';

export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'cash',
  'card',
  'investment',
  'other',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const DEFAULT_ACCOUNT_NAME = 'Principal';

export interface AccountProps {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  /** Money in the account before the first recorded movement (may be negative for cards). */
  initialBalanceCents: Cents;
  color: string;
  icon: string;
  archived: boolean;
  createdAt: string;
}

export interface AccountInput {
  name: string;
  type?: string;
  initialBalanceCents?: Cents;
  color?: string;
  icon?: string;
}

function cleanName(name: string): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) throw new ValidationError('El nombre de la cuenta no puede estar vacío');
  if (trimmed.length > 50) throw new ValidationError('El nombre no puede superar 50 caracteres');
  return trimmed;
}

function cleanType(type: string | undefined): AccountType {
  const value = (type ?? 'checking') as AccountType;
  if (!ACCOUNT_TYPES.includes(value)) {
    throw new ValidationError(`Tipo de cuenta inválido. Debe ser ${ACCOUNT_TYPES.join(', ')}`);
  }
  return value;
}

function cleanBalance(cents: Cents | undefined): Cents {
  const value = cents ?? 0;
  if (!Number.isInteger(value)) throw new ValidationError('Saldo inicial inválido');
  return value;
}

function cleanColor(color: string | undefined, fallback: string): string {
  const value = (color ?? '').trim() || fallback;
  if (!isHexColor(value)) throw new ValidationError('Color inválido (formato #rrggbb)');
  return value;
}

export class Account {
  private constructor(private readonly props: AccountProps) {}

  static create(userId: string, input: AccountInput, now = new Date()): Account {
    return new Account({
      id: randomUUID(),
      userId,
      name: cleanName(input.name),
      type: cleanType(input.type),
      initialBalanceCents: cleanBalance(input.initialBalanceCents),
      color: cleanColor(input.color, '#6366f1'),
      icon: (input.icon ?? '').trim() || '🏦',
      archived: false,
      createdAt: now.toISOString(),
    });
  }

  static reconstitute(props: AccountProps): Account {
    return new Account({ ...props });
  }

  update(changes: Partial<AccountInput> & { archived?: boolean }): Account {
    return new Account({
      ...this.props,
      name: changes.name !== undefined ? cleanName(changes.name) : this.props.name,
      type: changes.type !== undefined ? cleanType(changes.type) : this.props.type,
      initialBalanceCents:
        changes.initialBalanceCents !== undefined
          ? cleanBalance(changes.initialBalanceCents)
          : this.props.initialBalanceCents,
      color:
        changes.color !== undefined
          ? cleanColor(changes.color, this.props.color)
          : this.props.color,
      icon: changes.icon !== undefined ? changes.icon.trim() || this.props.icon : this.props.icon,
      archived: changes.archived ?? this.props.archived,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get name(): string {
    return this.props.name;
  }
  get archived(): boolean {
    return this.props.archived;
  }
  get initialBalanceCents(): Cents {
    return this.props.initialBalanceCents;
  }

  toPrimitives(): AccountProps {
    return { ...this.props };
  }
}
