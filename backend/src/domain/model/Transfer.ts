import { randomUUID } from 'crypto';
import { ValidationError } from '@domain/errors';
import { Cents, assertPositiveCents } from '@domain/shared/money';
import { toDateOnly } from '@domain/shared/period';

export interface TransferProps {
  id: string;
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: Cents;
  date: string;
  description: string | null;
  createdAt: string;
}

/** Money moved between two of the user's accounts. It never changes the total balance. */
export class Transfer {
  private constructor(private readonly props: TransferProps) {}

  static create(
    input: Omit<TransferProps, 'id' | 'createdAt' | 'description'> & {
      description?: string | null;
    },
    now = new Date()
  ): Transfer {
    if (input.fromAccountId === input.toAccountId) {
      throw new ValidationError(
        'Las cuentas de origen y destino deben ser distintas',
        'SAME_ACCOUNT'
      );
    }
    assertPositiveCents(input.amountCents);
    const description = (input.description ?? '').trim();
    if (description.length > 200) throw new ValidationError('Descripción demasiado larga');
    return new Transfer({
      id: randomUUID(),
      userId: input.userId,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amountCents: input.amountCents,
      date: toDateOnly(input.date),
      description: description || null,
      createdAt: now.toISOString(),
    });
  }

  static reconstitute(props: TransferProps): Transfer {
    return new Transfer({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  toPrimitives(): TransferProps {
    return { ...this.props };
  }
}
