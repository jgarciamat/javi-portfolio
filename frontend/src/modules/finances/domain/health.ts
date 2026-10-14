import type { BudgetLine, Transaction } from './types';

export type PillarId = 'saving' | 'cushion' | 'debt' | 'budgets';

export interface HealthInput {
  /** Income and savings of the viewed month. */
  income: number;
  saving: number;
  /** What the person spends in a normal month (to size the cushion). */
  monthlyExpenses: number;
  /** Money in the accounts that are not archived. */
  liquid: number;
  /** Total debts, or null when they are not known (Premium section). */
  debt: number | null;
  budgets: BudgetLine[];
}

export interface Pillar {
  id: PillarId;
  /** Points earned out of {@link PILLAR_POINTS}. */
  points: number;
  /** The figure behind it: rate of saving (%), months of cushion, debt / yearly income (%), budgets kept (%). */
  value: number;
}

export type HealthLevel = 'excellent' | 'good' | 'improvable' | 'fragile';

export interface Health {
  /** 0 to 100, from the pillars that can be measured. */
  score: number;
  level: HealthLevel;
  pillars: Pillar[];
}

export const PILLAR_POINTS = 25;
const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export const levelOf = (score: number): HealthLevel =>
  score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'improvable' : 'fragile';

/**
 * A simple health score: saving at least 20 % of the income, a cushion of 6 months of
 * expenses, little debt and keeping to the budgets. Four pillars of 25 points; the ones that
 * cannot be measured (no budgets, debts unknown) are left out and the rest is scaled to 100.
 */
export function healthScore(input: HealthInput): Health {
  const pillars: Pillar[] = [];

  const rate = input.income > 0 ? (input.saving / input.income) * 100 : 0;
  pillars.push({
    id: 'saving',
    value: round1(rate),
    points: round1(clamp(rate / 20) * PILLAR_POINTS),
  });

  const months =
    input.monthlyExpenses > 0 ? input.liquid / input.monthlyExpenses : input.liquid > 0 ? 6 : 0;
  pillars.push({
    id: 'cushion',
    value: round1(Math.max(0, months)),
    points: round1(clamp(months / 6) * PILLAR_POINTS),
  });

  if (input.debt !== null) {
    const yearly = input.income * 12;
    const ratio = input.debt <= 0 ? 0 : yearly > 0 ? (input.debt / yearly) * 100 : 100;
    // Up to 10 % of a year of income is fine; from 100 % it counts nothing.
    pillars.push({
      id: 'debt',
      value: round1(ratio),
      points: round1((1 - clamp((ratio - 10) / 90)) * PILLAR_POINTS),
    });
  }

  if (input.budgets.length > 0) {
    const kept =
      (input.budgets.filter((b) => b.level !== 'danger').length / input.budgets.length) * 100;
    pillars.push({
      id: 'budgets',
      value: round1(kept),
      points: round1((kept / 100) * PILLAR_POINTS),
    });
  }

  const earned = pillars.reduce((sum, p) => sum + p.points, 0);
  const score = Math.round((earned / (pillars.length * PILLAR_POINTS)) * 100);
  return { score, level: levelOf(score), pillars };
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export type ChallengeId = 'noSpend' | 'save20' | 'budgets';

export interface ChallengeProgress {
  /** Current figure and what it needs to reach. */
  current: number;
  target: number;
  done: boolean;
}

const MS_DAY = 86_400_000;
const utc = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** Days of the period up to today without a single expense, and the current streak of them. */
export function noSpendDays(
  transactions: Transaction[],
  start: string,
  today: string
): { days: number; streak: number; elapsed: number } {
  const spent = new Set(transactions.filter((t) => t.type === 'EXPENSE').map((t) => t.date));
  const elapsed = Math.max(0, Math.floor((utc(today) - utc(start)) / MS_DAY) + 1);
  let days = 0;
  let streak = 0;
  for (let i = 0; i < elapsed; i++) {
    const day = new Date(utc(start) + i * MS_DAY).toISOString().slice(0, 10);
    if (spent.has(day)) {
      streak = 0;
    } else {
      days += 1;
      streak += 1;
    }
  }
  return { days, streak, elapsed };
}

export const NO_SPEND_TARGET = 8;

export function challengeProgress(
  id: ChallengeId,
  data: { noSpendDays: number; income: number; saving: number; budgets: BudgetLine[] }
): ChallengeProgress {
  switch (id) {
    case 'noSpend':
      return {
        current: data.noSpendDays,
        target: NO_SPEND_TARGET,
        done: data.noSpendDays >= NO_SPEND_TARGET,
      };
    case 'save20': {
      const rate = data.income > 0 ? (data.saving / data.income) * 100 : 0;
      return { current: round1(Math.max(0, rate)), target: 20, done: rate >= 20 };
    }
    case 'budgets': {
      const total = data.budgets.length;
      const kept = data.budgets.filter((b) => b.level !== 'danger').length;
      return { current: kept, target: total, done: total > 0 && kept === total };
    }
  }
}
