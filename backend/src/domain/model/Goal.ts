import { randomUUID } from 'crypto';
import { ValidationError } from '@domain/errors';
import { Cents, assertPositiveCents } from '@domain/shared/money';
import { Period, periodOrdinal, toDateOnly } from '@domain/shared/period';
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
  const name = props.name.trim();
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

/** Complete periods the saving pace of a goal looks back on. */
export const PACE_PERIODS = 6;

export interface GoalPace {
  /**
   * Average SAVING per month in the goal's category over the last complete periods (the current
   * one left out), counting the months with nothing since the first saving there; null with
   * fewer than 2 such periods.
   */
  averageMonthlyCents: Cents | null;
  /** Complete periods that average is based on (0 to 6). */
  historyMonths: number;
  /** Saved in the current period: the estimate then starts next month. */
  savedThisPeriodCents: Cents;
}

/**
 * The real saving pace of a goal, for «at your pace you get there in…»
 * (docs/disenos/dinero-perdido-y-fecha-meta.md, D.1). `savings` holds the SAVING of the goal's
 * category per period ordinal (see `periodOrdinal`).
 */
export function computeGoalPace(savings: ReadonlyMap<number, Cents>, current: Period): GoalPace {
  const now = periodOrdinal(current);
  const saved = [...savings].filter(([, cents]) => cents > 0).map(([ordinal]) => ordinal);
  const savedThisPeriodCents = savings.get(now) ?? 0;
  if (saved.length === 0)
    return { averageMonthlyCents: null, historyMonths: 0, savedThisPeriodCents };
  const from = Math.max(Math.min(...saved), now - PACE_PERIODS);
  const historyMonths = Math.max(0, now - from);
  let total = 0;
  for (let p = from; p < now; p++) total += savings.get(p) ?? 0;
  return {
    averageMonthlyCents: historyMonths >= 2 ? Math.round(total / historyMonths) : null,
    historyMonths,
    savedThisPeriodCents,
  };
}
