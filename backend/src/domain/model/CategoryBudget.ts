import { randomUUID } from 'crypto';
import { Cents, assertPositiveCents } from '@domain/shared/money';

export interface CategoryBudgetProps {
  id: string;
  userId: string;
  categoryId: string;
  /** Monthly spending limit for the category. */
  amountCents: Cents;
  createdAt: string;
}

export class CategoryBudget {
  private constructor(private readonly props: CategoryBudgetProps) {}

  static create(
    userId: string,
    categoryId: string,
    amountCents: Cents,
    now = new Date()
  ): CategoryBudget {
    assertPositiveCents(amountCents, 'límite');
    return new CategoryBudget({
      id: randomUUID(),
      userId,
      categoryId,
      amountCents,
      createdAt: now.toISOString(),
    });
  }

  static reconstitute(props: CategoryBudgetProps): CategoryBudget {
    return new CategoryBudget({ ...props });
  }

  withAmount(amountCents: Cents): CategoryBudget {
    assertPositiveCents(amountCents, 'límite');
    return new CategoryBudget({ ...this.props, amountCents });
  }

  get id(): string {
    return this.props.id;
  }

  toPrimitives(): CategoryBudgetProps {
    return { ...this.props };
  }
}
