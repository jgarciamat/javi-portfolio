import { randomUUID } from 'crypto';
import { NotFoundError, ValidationError } from '@domain/errors';
import {
  SplitExpenseRecord,
  SplitGroup,
  SplitMember,
  SplitRepository,
  UnitOfWork,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import {
  Balance,
  Transfer,
  computeBalances,
  splitEqually,
  suggestTransfers,
} from '@domain/services/split';
import { Cents } from '@domain/shared/money';
import { toDateOnly, todayDateOnly } from '@domain/shared/period';

export const MAX_GROUPS = 20;
export const MAX_MEMBERS = 12;
export const MAX_EXPENSES = 500;

export interface SplitGroupSummary {
  id: string;
  name: string;
  members: number;
  /** Shared expenses recorded (settlements not counted). */
  expenses: number;
}

export interface SplitGroupView {
  id: string;
  name: string;
  members: (SplitMember & { balanceCents: Cents })[];
  expenses: SplitExpenseRecord[];
  transfers: Transfer[];
}

const clean = (value: string, what: string, max: number): string => {
  const text = value.trim();
  if (!text || text.length > max) {
    throw new ValidationError(`${what}: entre 1 y ${max} caracteres`);
  }
  return text;
};

/** Expenses shared with friends or flatmates: who paid, how it is split and who owes whom. */
export class SplitService {
  constructor(
    private readonly splits: SplitRepository,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock
  ) {}

  list(userId: string): SplitGroupSummary[] {
    return this.splits.listGroups(userId).map((g) => ({
      id: g.id,
      name: g.name,
      members: this.splits.members(g.id).length,
      expenses: this.splits.expenses(g.id).filter((e) => !e.settlement).length,
    }));
  }

  create(userId: string, input: { name: string; members: string[] }): SplitGroupView {
    const name = clean(input.name, 'Nombre del grupo', 60);
    const names = input.members.map((m) => clean(m, 'Nombre', 40));
    if (names.length < 2 || names.length > MAX_MEMBERS) {
      throw new ValidationError(`Un grupo necesita entre 2 y ${MAX_MEMBERS} personas`, 'MEMBERS');
    }
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
      throw new ValidationError('Los nombres no pueden repetirse', 'MEMBERS');
    }
    if (this.splits.listGroups(userId).length >= MAX_GROUPS) {
      throw new ValidationError(`Máximo ${MAX_GROUPS} grupos`, 'TOO_MANY_GROUPS');
    }
    const group: SplitGroup = {
      id: randomUUID(),
      userId,
      name,
      createdAt: this.clock.now().toISOString(),
    };
    this.splits.createGroup(
      group,
      names.map((n) => ({ id: randomUUID(), name: n }))
    );
    return this.get(userId, group.id);
  }

  get(userId: string, id: string): SplitGroupView {
    const group = this.requireGroup(userId, id);
    const members = this.splits.members(group.id);
    const expenses = this.splits.expenses(group.id);
    const balances: Balance[] = computeBalances(
      members.map((m) => m.id),
      expenses
    );
    return {
      id: group.id,
      name: group.name,
      members: members.map((m) => ({
        ...m,
        balanceCents: balances.find((b) => b.memberId === m.id)?.cents as Cents,
      })),
      expenses,
      transfers: suggestTransfers(balances),
    };
  }

  /** `participants` share it equally; by default everyone does. */
  addExpense(
    userId: string,
    groupId: string,
    input: {
      description: string;
      amountCents: Cents;
      paidBy: string;
      participants?: string[];
      date?: string | null;
    }
  ): SplitGroupView {
    const group = this.requireGroup(userId, groupId);
    const ids = this.splits.members(group.id).map((m) => m.id);
    const participants = input.participants?.length ? input.participants : ids;
    this.assertMembers(ids, [input.paidBy, ...participants]);
    this.record(group.id, {
      description: clean(input.description, 'Descripción', 100),
      amountCents: input.amountCents,
      paidBy: input.paidBy,
      shares: [...splitEqually(input.amountCents, [...new Set(participants)])].map(
        ([memberId, shareCents]) => ({ memberId, shareCents })
      ),
      settlement: false,
      date: input.date,
    });
    return this.get(userId, groupId);
  }

  /** `from` pays `to` back: it changes the balances like an expense only `to` benefits from. */
  settle(
    userId: string,
    groupId: string,
    input: { from: string; to: string; amountCents: Cents; date?: string | null }
  ): SplitGroupView {
    const group = this.requireGroup(userId, groupId);
    const ids = this.splits.members(group.id).map((m) => m.id);
    this.assertMembers(ids, [input.from, input.to]);
    if (input.from === input.to)
      throw new ValidationError('Elige dos personas distintas', 'MEMBERS');
    this.record(group.id, {
      description: 'Pago',
      amountCents: input.amountCents,
      paidBy: input.from,
      shares: [{ memberId: input.to, shareCents: input.amountCents }],
      settlement: true,
      date: input.date,
    });
    return this.get(userId, groupId);
  }

  deleteExpense(userId: string, groupId: string, expenseId: string): SplitGroupView {
    this.requireGroup(userId, groupId);
    if (!this.splits.deleteExpense(groupId, expenseId)) {
      throw new NotFoundError('Gasto no encontrado', 'EXPENSE_NOT_FOUND');
    }
    return this.get(userId, groupId);
  }

  delete(userId: string, id: string): void {
    if (!this.splits.deleteGroup(userId, id)) {
      throw new NotFoundError('Grupo no encontrado', 'GROUP_NOT_FOUND');
    }
  }

  private requireGroup(userId: string, id: string): SplitGroup {
    const group = this.splits.findGroup(userId, id);
    if (!group) throw new NotFoundError('Grupo no encontrado', 'GROUP_NOT_FOUND');
    return group;
  }

  private assertMembers(known: string[], used: string[]): void {
    if (used.some((id) => !known.includes(id))) {
      throw new ValidationError('Persona no encontrada en el grupo', 'MEMBERS');
    }
  }

  private record(
    groupId: string,
    e: Omit<SplitExpenseRecord, 'id' | 'date'> & { date?: string | null }
  ): void {
    if (this.splits.expenses(groupId).length >= MAX_EXPENSES) {
      throw new ValidationError(`Máximo ${MAX_EXPENSES} gastos por grupo`, 'TOO_MANY_EXPENSES');
    }
    const now = this.clock.now();
    this.uow.run(() =>
      this.splits.addExpense(
        groupId,
        { ...e, id: randomUUID(), date: e.date ? toDateOnly(e.date) : todayDateOnly(now) },
        now.toISOString()
      )
    );
  }
}
