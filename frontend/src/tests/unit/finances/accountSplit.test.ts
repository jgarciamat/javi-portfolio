import {
  accountLabel,
  addSplitRow,
  inAccount,
  noSplit,
  removeSplitRow,
  setSplitAccount,
  setSplitAmount,
  splitEqually,
  splitError,
  splitFromParts,
  splitLabel,
  splitParts,
  splitProblem,
  splitRemaining,
  splitTarget,
  splitWithTotal,
  toggleSplit,
  type SplitForm,
} from '@modules/finances/domain/accountSplit';
import {
  emptyRuleForm,
  ruleToForm,
  validateRuleForm,
} from '@modules/finances/domain/recurringForm';
import * as f from '@test-utils/fixtures';

const main = f.account({ id: 'a1', name: 'Principal', isDefault: true });
const checking = f.account({ id: 'a2', name: 'Corriente' });
const cash = f.account({ id: 'a3', name: 'Efectivo' });
const accounts = [main, checking, cash];

const rows = (...list: [string, string][]) =>
  list.map(([accountId, amount]) => ({ accountId, amount }));
const form = (list: [string, string][], autoLast = true): SplitForm => ({
  on: true,
  rows: rows(...list),
  autoLast,
});

describe('account split (form logic)', () => {
  it('adds what is left, ignoring what is not a number', () => {
    expect(splitRemaining('800', rows(['a', '500'], ['b', '']))).toBe(30_000);
    expect(splitRemaining('800', rows(['a', '500'], ['b', '400']))).toBe(-10_000);
    expect(splitRemaining('', rows(['a', '5']))).toBe(-500);
    expect(splitRemaining('12,5', [])).toBe(1250);
    expect(splitRemaining('abc', [])).toBe(0);
  });

  it('turned on starts with the movement account and another one with the whole amount', () => {
    const on = toggleSplit(noSplit(), true, '800', accounts, 'a2');
    expect(on).toEqual(
      form([
        ['a2', ''],
        ['a1', '800'],
      ])
    );
    // An account that is not among the choices: the first ones.
    expect(toggleSplit(noSplit(), true, '', accounts, 'gone').rows).toEqual(
      rows(['a1', ''], ['a2', ''])
    );
    expect(toggleSplit(noSplit(), true, '8', accounts, null).rows[0].accountId).toBe('a1');
    // Off keeps the rows (turning it on again brings them back).
    const off = toggleSplit(on, false, '800', accounts, 'a2');
    expect(off.on).toBe(false);
    expect(toggleSplit(off, true, '800', accounts, 'a2')).toEqual(on);
    // Without another account to use, the second row has none.
    expect(toggleSplit(noSplit(), true, '8', [main], 'a1').rows[1].accountId).toBe('');
  });

  it('the last row follows the others until the person types in it', () => {
    let s = form([
      ['a1', ''],
      ['a2', '800'],
    ]);
    s = setSplitAmount(s, 0, '500', '800');
    expect(s.rows[1].amount).toBe('300');
    s = setSplitAmount(s, 0, '900', '800');
    expect(s.rows[1].amount).toBe('');
    s = setSplitAmount(s, 1, '250,5', '800');
    expect(s.autoLast).toBe(false);
    s = setSplitAmount(s, 0, '100', '800');
    expect(s.rows[1].amount).toBe('250,5');
    expect(splitWithTotal(s, '1000')).toBe(s);
    const auto = splitWithTotal(
      form([
        ['a1', '500'],
        ['a2', '300'],
      ]),
      '1000'
    );
    expect(auto.rows[1].amount).toBe('500');
    expect(splitWithTotal(noSplit(), '5')).toEqual(noSplit());
    expect(splitWithTotal({ on: true, rows: [], autoLast: true }, '5').rows).toEqual([]);
    expect(setSplitAccount(s, 1, 'a3').rows[1]).toEqual({ accountId: 'a3', amount: '250,5' });
  });

  it('adds and removes rows; the new last one takes what is left', () => {
    let s = form(
      [
        ['a1', '500'],
        ['a2', '300'],
      ],
      false
    );
    s = addSplitRow(s, '800', accounts);
    expect(s.rows[2]).toEqual({ accountId: 'a3', amount: '' });
    s = setSplitAmount(s, 1, '200', '800');
    expect(s.rows[2].amount).toBe('100');
    s = removeSplitRow(s, 0, '800');
    expect(s.rows).toEqual(rows(['a2', '200'], ['a3', '600']));
    expect(addSplitRow(s, '800', [checking, cash]).rows[2].accountId).toBe('');
  });

  it('splits equally, the cents left going to the first ones', () => {
    expect(
      splitEqually(
        form([
          ['a1', ''],
          ['a2', ''],
          ['a3', ''],
        ]),
        '100'
      ).rows
    ).toEqual(rows(['a1', '33.34'], ['a2', '33.33'], ['a3', '33.33']));
    expect(
      splitEqually(
        form(
          [
            ['a1', '9'],
            ['a2', ''],
          ],
          false
        ),
        ''
      ).rows
    ).toEqual(rows(['a1', ''], ['a2', '']));
  });
});

describe('account split (checks, API and names)', () => {
  it('says the first problem, or nothing when it adds up', () => {
    expect(splitError(form([['a1', '800']]), '800')).toBe('app.accountSplit.error.few');
    expect(
      splitError(
        form([
          ['a1', '500'],
          ['', '300'],
        ]),
        '800'
      )
    ).toBe('app.accountSplit.error.account');
    expect(
      splitError(
        form([
          ['a1', '500'],
          ['a1', '300'],
        ]),
        '800'
      )
    ).toBe('app.accountSplit.error.duplicate');
    expect(
      splitError(
        form([
          ['a1', '800'],
          ['a2', '0'],
        ]),
        '800'
      )
    ).toBe('app.accountSplit.error.amount');
    expect(
      splitError(
        form([
          ['a1', '800'],
          ['a2', 'x'],
        ]),
        '800'
      )
    ).toBe('app.accountSplit.error.amount');
    expect(
      splitError(
        form([
          ['a1', '500'],
          ['a2', '299.99'],
        ]),
        '800'
      )
    ).toBe('app.accountSplit.error.sum');
    expect(
      splitError(
        form([
          ['a1', '500,5'],
          ['a2', '299.5'],
        ]),
        '800'
      )
    ).toBeNull();
  });

  it('turns into what the API takes and back', () => {
    expect(
      splitParts(
        form([
          ['a1', '500,5'],
          ['a2', '299.5'],
        ])
      )
    ).toEqual([
      { accountId: 'a1', amount: 500.5 },
      { accountId: 'a2', amount: 299.5 },
    ]);
    expect(splitFromParts(undefined)).toEqual(noSplit());
    expect(splitFromParts([{ accountId: 'a1', amount: 5 }])).toEqual(noSplit());
    expect(
      splitFromParts([
        { accountId: 'a1', amount: 500 },
        { accountId: 'a2', amount: 300.5 },
      ])
    ).toEqual(
      form(
        [
          ['a1', '500'],
          ['a2', '300.5'],
        ],
        false
      )
    );
  });

  it('names the parts of a movement and finds it in each of its accounts', () => {
    const money = (n: number) => `${n} €`;
    const parts = [
      { accountId: 'a2', accountName: 'Corriente', amount: 500 },
      { accountId: 'a3', accountName: 'Efectivo', amount: 300 },
    ];
    expect(splitLabel(parts, money)).toBe('500 € Corriente + 300 € Efectivo');
    expect(splitLabel([{ accountId: 'a2', amount: 5 }], money, () => 'X')).toBe('5 € X');
    expect(splitLabel([{ accountId: 'a2', amount: 5 }], money)).toBe('5 €');
    const tx = f.transaction({ accountId: 'a2', splits: parts });
    expect(accountLabel(tx, money)).toBe('500 € Corriente + 300 € Efectivo');
    expect(accountLabel(f.transaction({ accountName: 'Principal' }), money)).toBe('Principal');
    expect(accountLabel(f.transaction({ accountName: undefined }), money)).toBe('');
    expect(inAccount(tx, 'a3')).toBe(true);
    expect(inAccount(tx, 'a2')).toBe(true);
    expect(inAccount(tx, 'a1')).toBe(false);
    expect(inAccount(f.transaction({ accountId: 'a1' }), 'a1')).toBe(true);
  });
});

describe('where a split amount goes', () => {
  it('says the problem only while it is on', () => {
    const wrong = form([
      ['a1', '500'],
      ['a2', '200'],
    ]);
    expect(splitProblem(wrong, '800')).toBe('app.accountSplit.error.sum');
    expect(splitProblem({ ...wrong, on: false }, '800')).toBeNull();
  });

  it("is the first part's account with the parts, or the account alone", () => {
    const split = form([
      ['a2', '500'],
      ['a3', '300'],
    ]);
    expect(splitTarget(split, 'a1')).toEqual({
      accountId: 'a2',
      splits: [
        { accountId: 'a2', amount: 500 },
        { accountId: 'a3', amount: 300 },
      ],
    });
    expect(splitTarget({ ...split, on: false }, 'a1')).toEqual({ accountId: 'a1', splits: null });
  });

  it('an automatic operation split between accounts, from the form and back', () => {
    const base = {
      ...emptyRuleForm(new Date(2026, 2, 15)),
      description: 'Cuenta común',
      amount: '800',
      category: 'Hogar',
    };
    expect(
      validateRuleForm({
        ...base,
        split: form([
          ['a2', '500'],
          ['a3', '200'],
        ]),
      })
    ).toEqual({
      error: 'app.accountSplit.error.sum',
    });
    const ok = validateRuleForm({
      ...base,
      accountId: 'a1',
      split: form([
        ['a2', '500'],
        ['a3', '300'],
      ]),
    });
    expect(ok).toMatchObject({
      dto: {
        accountId: 'a2',
        splits: [
          { accountId: 'a2', amount: 500 },
          { accountId: 'a3', amount: 300 },
        ],
      },
    });
    const rule = f.rule({
      splits: [
        { accountId: 'a2', amount: 500 },
        { accountId: 'a3', amount: 300 },
      ],
    });
    expect(ruleToForm(rule).split).toEqual(
      form(
        [
          ['a2', '500'],
          ['a3', '300'],
        ],
        false
      )
    );
    expect(ruleToForm(f.rule()).split).toEqual(noSplit());
  });
});
