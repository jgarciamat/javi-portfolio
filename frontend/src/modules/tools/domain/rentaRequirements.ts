/**
 * The requirements of a deduction, checked before it is applied: what the return already knows
 * (the person's age, the children, a disability) is checked by itself, and the rest is asked in
 * short yes-or-no questions. A deduction is applied only when every requirement is met: one not met
 * leaves it out, one not answered yet is asked (and it is not applied meanwhile).
 *
 * The income limits stay in `Deduction.incomeLimit` (worked out with the tax base by the engine).
 */
import type { Family } from './rentaCalc';

export type Check =
  /** The person is this age or younger on 31 December. */
  | { kind: 'maxAge'; age: number }
  /** The person is this age or older on 31 December. */
  | { kind: 'minAge'; age: number }
  /** At least this many children giving the minimum. */
  | { kind: 'children'; min: number }
  /** A child under this age on 31 December. */
  | { kind: 'childUnder'; age: number }
  /** The person's own disability, of at least this degree. */
  | { kind: 'disability'; min: 33 | 65 }
  /** Asked: it must be «yes». `id` is unique in the deduction; `q` is the question as asked. */
  | { kind: 'ask'; id: string; q: string };

export type CheckAnswers = Record<string, 'yes' | 'no'>;

export interface CheckStatus {
  status: 'ok' | 'fail' | 'missing';
  /** The first requirement not met (for the message). */
  failed: Check | null;
  /** The questions still to answer. */
  missing: Extract<Check, { kind: 'ask' }>[];
}

/** Whether one requirement known from the return is met. */
function known(c: Exclude<Check, { kind: 'ask' }>, family: Family): boolean {
  switch (c.kind) {
    case 'maxAge':
      return family.age <= c.age;
    case 'minAge':
      return family.age >= c.age;
    case 'children':
      return family.children.length >= c.min;
    case 'childUnder':
      return family.children.some((child) => child.age < c.age);
    case 'disability':
      return family.disability >= c.min;
  }
}

/** The requirements of a deduction with the data of the return and the answers given. */
export function checkDeduction(
  checks: Check[] | undefined,
  family: Family,
  answers: CheckAnswers | undefined
): CheckStatus {
  const missing: Extract<Check, { kind: 'ask' }>[] = [];
  for (const c of checks ?? []) {
    if (c.kind === 'ask') {
      const a = answers?.[c.id];
      if (a === 'no') return { status: 'fail', failed: c, missing: [] };
      if (a !== 'yes') missing.push(c);
    } else if (!known(c, family)) return { status: 'fail', failed: c, missing: [] };
  }
  return { status: missing.length > 0 ? 'missing' : 'ok', failed: null, missing };
}

/** Every question of the requirements answered «yes»: to know what a deduction would give. */
export function allYes(checks: Check[] | undefined): CheckAnswers | undefined {
  const asks = (checks ?? []).filter((c): c is Extract<Check, { kind: 'ask' }> => c.kind === 'ask');
  return asks.length > 0 ? Object.fromEntries(asks.map((c) => [c.id, 'yes' as const])) : undefined;
}
