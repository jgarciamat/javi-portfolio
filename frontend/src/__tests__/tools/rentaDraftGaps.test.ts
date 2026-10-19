import type { Deduction } from '@modules/tools/domain/rentaData';
import { choiceFor, draftGaps, verdictOf, withGaps } from '@modules/tools/domain/rentaDraftGaps';

const base = { group: 'other', summary: '', requirements: '', url: '' } as const;
const fixed: Deduction = {
  ...base,
  id: 'f',
  title: 'Por nacimiento de hijos',
  kind: 'fixed',
  amount: 300,
};
const perChild: Deduction = { ...fixed, id: 'pc', perChild: [100, 200] };
const percent: Deduction = {
  ...base,
  id: 'p',
  title: 'Por gastos de guardería',
  kind: 'percent',
  percent: 15,
};
const special: Deduction = { ...base, id: 's', title: 'Por otra cosa especial', kind: 'special' };

describe('what to mark for a deduction of the draft', () => {
  it('gives the units, the base or the amount', () => {
    expect(choiceFor(fixed, 600)).toEqual({ on: true, amount: '', units: '2' });
    expect(choiceFor(fixed, 100)).toEqual({ on: true, amount: '', units: '1' });
    expect(choiceFor(perChild, 300)).toEqual({ on: true, amount: '', units: '' });
    // 15 % of 1,000 is 150.
    expect(choiceFor(percent, 150)).toEqual({ on: true, amount: '1000', units: '' });
    expect(choiceFor(special, 80)).toEqual({ on: true, amount: '80', units: '' });
    expect(choiceFor({ ...percent, percent: undefined }, 80).amount).toBe('80');
  });

  it('leaves out what is already marked and keeps what has no deduction', () => {
    const applied = [
      { label: 'Por nacimiento o adopción de hijos', amount: 300 },
      { label: 'Por gastos de guardería de hijos', amount: 150 },
      { label: 'Por algo que no conocemos', amount: 20 },
    ];
    const gaps = draftGaps(applied, [fixed, percent], { p: { on: true, amount: '', units: '' } });
    expect(gaps.map((g) => g.deduction?.id ?? null)).toEqual(['f', null]);
    expect(withGaps({}, gaps)).toEqual({ f: { on: true, amount: '', units: '1' } });
  });
});

describe('the verdict', () => {
  it('matches, is explained by the gaps or is not', () => {
    expect(verdictOf(-100, -100, -100)).toEqual({ kind: 'match', diff: 0, explained: 0 });
    expect(verdictOf(-100, 35, -100.5)).toEqual({ kind: 'explained', diff: 135, explained: 135.5 });
    expect(verdictOf(-100, 35, 35)).toEqual({ kind: 'unexplained', diff: 135, explained: 0 });
    expect(verdictOf(-100, 35, 0)).toEqual({ kind: 'unexplained', diff: 135, explained: 35 });
  });
});
