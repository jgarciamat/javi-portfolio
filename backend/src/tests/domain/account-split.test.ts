import { DomainError } from '@domain/errors';
import { MAX_SPLITS, cleanSplits, mergeSplits, sameSplits } from '@domain/model/AccountSplit';
import { RecurringRule } from '@domain/model/RecurringRule';
import { Transaction } from '@domain/model/Transaction';

const parts = (...list: [string, number][]) =>
  list.map(([accountId, amountCents]) => ({ accountId, amountCents }));

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as DomainError).code;
  }
  return undefined;
};

describe('cleanSplits', () => {
  it('no parts is a movement in one account', () => {
    expect(cleanSplits(null, 100)).toEqual([]);
    expect(cleanSplits(undefined, 100)).toEqual([]);
    expect(cleanSplits([], 100)).toEqual([]);
  });

  it('keeps 2+ different accounts adding up exactly to the total', () => {
    const input = parts(['a', 50_000], ['b', 30_000]);
    const clean = cleanSplits(input, 80_000);
    expect(clean).toEqual(input);
    expect(clean[0]).not.toBe(input[0]);
  });

  it('refuses each wrong case with its own code', () => {
    expect(codeOf(() => cleanSplits(parts(['a', 100]), 100))).toBe('SPLIT_TOO_FEW');
    const many = Array.from({ length: MAX_SPLITS + 1 }, (_, i) => ({
      accountId: `a${i}`,
      amountCents: 1,
    }));
    expect(codeOf(() => cleanSplits(many, MAX_SPLITS + 1))).toBe('SPLIT_TOO_MANY');
    expect(codeOf(() => cleanSplits(parts(['a', 50], ['a', 50]), 100))).toBe(
      'SPLIT_DUPLICATE_ACCOUNT'
    );
    expect(codeOf(() => cleanSplits(parts(['a', 100], ['b', 0]), 100))).toBe(
      'SPLIT_INVALID_AMOUNT'
    );
    expect(codeOf(() => cleanSplits(parts(['a', 50.5], ['b', 49.5]), 100))).toBe(
      'SPLIT_INVALID_AMOUNT'
    );
    expect(codeOf(() => cleanSplits(parts(['a', -1], ['b', 101]), 100))).toBe(
      'SPLIT_INVALID_AMOUNT'
    );
    expect(() => cleanSplits(parts(['a', 50_000], ['b', 29_999]), 80_000)).toThrow(
      'Las partes suman 799.99 y el importe es 800.00'
    );
  });

  it('the most parts allowed are fine', () => {
    const ten = Array.from({ length: MAX_SPLITS }, (_, i) => ({
      accountId: `a${i}`,
      amountCents: 1,
    }));
    expect(cleanSplits(ten, MAX_SPLITS)).toHaveLength(MAX_SPLITS);
  });
});

describe('mergeSplits and sameSplits', () => {
  it('puts parts in the same account together, in order; one left is not split', () => {
    expect(mergeSplits(parts(['a', 1], ['b', 2], ['a', 3]))).toEqual(parts(['a', 4], ['b', 2]));
    expect(mergeSplits(parts(['a', 1], ['a', 2]))).toEqual([]);
    expect(mergeSplits([])).toEqual([]);
  });

  it('compares accounts, amounts and order', () => {
    const a = parts(['a', 1], ['b', 2]);
    expect(sameSplits(a, parts(['a', 1], ['b', 2]))).toBe(true);
    expect(sameSplits(a, parts(['b', 2], ['a', 1]))).toBe(false);
    expect(sameSplits(a, parts(['a', 1], ['b', 3]))).toBe(false);
    expect(sameSplits(a, parts(['a', 1]))).toBe(false);
    expect(sameSplits([], [])).toBe(true);
  });
});

const tx = (splits = parts(['a2', 500], ['a3', 300])) =>
  Transaction.create(
    {
      userId: 'u1',
      accountId: 'a1',
      categoryId: 'c1',
      description: 'Cuenta común',
      amountCents: 800,
      type: 'EXPENSE',
      date: '2026-03-10',
      splits,
    },
    1
  );

describe('Transaction split between accounts', () => {
  it('is noted under its first part and gives each account its part', () => {
    const t = tx();
    expect(t.accountId).toBe('a2');
    expect(t.parts).toEqual(parts(['a2', 500], ['a3', 300]));
    expect(t.toPrimitives().splits).toEqual(parts(['a2', 500], ['a3', 300]));
    const single = tx([]);
    expect(single.accountId).toBe('a1');
    expect(single.parts).toEqual(parts(['a1', 800]));
  });

  it('is checked when created', () => {
    expect(codeOf(() => tx(parts(['a2', 500], ['a3', 200])))).toBe('SPLIT_SUM_MISMATCH');
  });

  it('updates: other changes keep the parts; the amount alone does not add up', () => {
    const t = tx();
    expect(t.update({ description: 'Otra' }, 1).parts).toHaveLength(2);
    // The same account as now (what an older app sends) keeps them.
    expect(t.update({ accountId: 'a2' }, 1).parts).toHaveLength(2);
    expect(codeOf(() => t.update({ amountCents: 900 }, 1))).toBe('SPLIT_SUM_MISMATCH');
    const resplit = t.update({ amountCents: 900, splits: parts(['a3', 600], ['a1', 300]) }, 1);
    expect(resplit.accountId).toBe('a3');
  });

  it('updates: another account moves it whole; no parts leaves its account', () => {
    const t = tx();
    expect(t.update({ accountId: 'a9' }, 1).parts).toEqual(parts(['a9', 800]));
    expect(t.update({ splits: null }, 1).parts).toEqual(parts(['a2', 800]));
    expect(t.update({ splits: [] }, 1).parts).toEqual(parts(['a2', 800]));
    // The period and the parts survive the other copies.
    expect(t.withPeriodFor(15).parts).toHaveLength(2);
    expect(t.detachFromRule().parts).toHaveLength(2);
  });

  it('is rebuilt with copies of its parts', () => {
    const p = tx().toPrimitives();
    const rebuilt = Transaction.reconstitute(p);
    p.splits[0].amountCents = 1;
    expect(rebuilt.parts[0].amountCents).toBe(500);
  });
});

const rule = (over: Record<string, unknown> = {}) =>
  RecurringRule.create('u1', {
    description: 'Cuenta común',
    amountCents: 800,
    type: 'EXPENSE',
    categoryId: 'c1',
    accountId: 'a1',
    start: { year: 2026, month: 1 },
    splits: parts(['a2', 500], ['a3', 300]),
    ...over,
  });

describe('Recurring rule split between accounts', () => {
  it('is noted under its first part and says which accounts it uses', () => {
    const r = rule();
    expect(r.accountId).toBe('a2');
    expect(r.splits).toEqual(parts(['a2', 500], ['a3', 300]));
    expect(r.usesAccount('a3')).toBe(true);
    expect(r.usesAccount('a2')).toBe(true);
    expect(r.usesAccount('a1')).toBe(false);
    const single = rule({ splits: undefined });
    expect(single.splits).toEqual([]);
    expect(single.usesAccount('a1')).toBe(true);
    expect(RecurringRule.reconstitute(r.toPrimitives()).splits).toHaveLength(2);
  });

  it('updates like a movement', () => {
    const r = rule();
    expect(codeOf(() => r.update({ amountCents: 900 }))).toBe('SPLIT_SUM_MISMATCH');
    expect(r.update({ active: false }).splits).toHaveLength(2);
    expect(r.update({ accountId: 'a2' }).splits).toHaveLength(2);
    expect(r.update({ accountId: 'a9' }).toPrimitives()).toMatchObject({
      accountId: 'a9',
      splits: [],
    });
    expect(r.update({ splits: null }).toPrimitives()).toMatchObject({
      accountId: 'a2',
      splits: [],
    });
    expect(codeOf(() => rule({ splits: parts(['a2', 1], ['a3', 1]) }))).toBe('SPLIT_SUM_MISMATCH');
  });

  it('a change of parts is a change of accounts, ignored when asked', () => {
    const r = rule();
    const moved = r.update({ splits: parts(['a2', 400], ['a3', 400]) });
    expect(RecurringRule.accountsChanged(r, moved)).toBe(true);
    expect(RecurringRule.contentChanged(r, moved)).toBe(true);
    expect(RecurringRule.contentChanged(r, moved, { ignoreAccounts: true })).toBe(false);
    expect(RecurringRule.accountsChanged(r, r.update({ description: 'Otra' }))).toBe(false);
    const other = r.update({ accountId: 'a9' });
    expect(RecurringRule.accountsChanged(r, other)).toBe(true);
    expect(
      RecurringRule.contentChanged(r, r.update({ description: 'Otra' }), {
        ignoreAccounts: true,
      })
    ).toBe(true);
  });
});
