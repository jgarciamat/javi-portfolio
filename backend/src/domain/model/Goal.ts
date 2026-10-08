import { randomUUID } from 'crypto';
import { ValidationError } from '@domain/errors';
import { Cents, assertPositiveCents } from '@domain/shared/money';
import { toDateOnly } from '@domain/shared/period';
import { isHexColor } from '@domain/shared/text';

/**
 * A savings goal. Progress is the sum of SAVING movements recorded in the goal's
 * category, so the user keeps recording savings as usual and the goal fills up.
 */
export interface GoalProps {
  id: string;
  userId: string;
  name: string;
  targetCents: Cents;
  targetDate: string | null;
  categoryId: string;
  icon: string;
  color: string;
  archived: boolean;
  createdAt: string;
}

export interface GoalInput {
  name: string;
  targetCents: Cents;
  targetDate?: string | null;
  categoryId: string;
  icon?: string;
  color?: string;
  archived?: boolean;
}

function validate(props: GoalProps): GoalProps {
  const name = (props.name ?? '').trim();
  if (!name) throw new ValidationError('El nombre de la meta no puede estar vacío');
  if (name.length > 80) throw new ValidationError('Nombre demasiado largo');
  assertPositiveCents(props.targetCents, 'objetivo');
  if (!isHexColor(props.color)) throw new ValidationError('Color inválido (formato #rrggbb)');
  return {
    ...props,
    name,
    targetDate: props.targetDate ? toDateOnly(props.targetDate) : null,
    icon: props.icon.trim() || '🎯',
  };
}

export class Goal {
  private constructor(private readonly props: GoalProps) {}

  static create(userId: string, input: GoalInput, now = new Date()): Goal {
    return new Goal(
      validate({
        id: randomUUID(),
        userId,
        name: input.name,
        targetCents: input.targetCents,
        targetDate: input.targetDate ?? null,
        categoryId: input.categoryId,
        icon: input.icon ?? '🎯',
        color: input.color ?? '#10b981',
        archived: input.archived ?? false,
        createdAt: now.toISOString(),
      })
    );
  }

  static reconstitute(props: GoalProps): Goal {
    return new Goal({ ...props });
  }

  update(changes: Partial<GoalInput>): Goal {
    const next = { ...this.props };
    if (changes.name !== undefined) next.name = changes.name;
    if (changes.targetCents !== undefined) next.targetCents = changes.targetCents;
    if (changes.targetDate !== undefined) next.targetDate = changes.targetDate;
    if (changes.categoryId !== undefined) next.categoryId = changes.categoryId;
    if (changes.icon !== undefined) next.icon = changes.icon;
    if (changes.color !== undefined) next.color = changes.color;
    if (changes.archived !== undefined) next.archived = changes.archived;
    return new Goal(validate(next));
  }

  get id(): string {
    return this.props.id;
  }
  get categoryId(): string {
    return this.props.categoryId;
  }

  toPrimitives(): GoalProps {
    return { ...this.props };
  }
}

export interface GoalProgress {
  savedCents: Cents;
  remainingCents: Cents;
  percentage: number;
  /** Months left until the target date (inclusive of the current one), or null without date. */
  monthsLeft: number | null;
  /** Saving needed per month to reach the target on time, or null without date. */
  monthlyNeededCents: Cents | null;
  completed: boolean;
}

export function computeGoalProgress(
  goal: GoalProps,
  savedCents: Cents,
  today: string
): GoalProgress {
  const remainingCents = Math.max(0, goal.targetCents - savedCents);
  const percentage = Math.min(100, Math.round((savedCents / goal.targetCents) * 1000) / 10);
  let monthsLeft: number | null = null;
  let monthlyNeededCents: Cents | null = null;
  if (goal.targetDate) {
    const [ty, tm] = goal.targetDate.split('-').map(Number);
    const [cy, cm] = today.split('-').map(Number);
    monthsLeft = Math.max(0, ty * 12 + tm - (cy * 12 + cm) + 1);
    monthlyNeededCents = monthsLeft > 0 ? Math.ceil(remainingCents / monthsLeft) : remainingCents;
  }
  return {
    savedCents,
    remainingCents,
    percentage: Math.max(0, percentage),
    monthsLeft,
    monthlyNeededCents,
    completed: savedCents >= goal.targetCents,
  };
}
