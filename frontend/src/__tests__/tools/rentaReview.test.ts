import type { RentaResult } from '@modules/tools/domain/rentaCalc';
import type { Deduction } from '@modules/tools/domain/rentaData';
import { NO_DRAFT, readDraft } from '@modules/tools/domain/rentaDraft';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import {
  NO_REVIEW,
  decide,
  needsAmount,
  queueOf,
  reviewOf,
  reviewOrder,
  situationOf,
} from '@modules/tools/domain/rentaReview';

const form = (over: Partial<RentaForm> = {}): RentaForm => ({ ...emptyForm('30000'), ...over });
const reading = readDraft('Retribuciones dinerarias 1.000,00 0003', {
  year: 2025,
  communities: [],
});

describe('what the form says about the person', () => {
  it('reads the family, the disabilities and the age', () => {
    const s = situationOf(
      form({
        age: '67',
        disability: 33,
        children: [
          { age: '2', disability: 0 },
          { age: '9', disability: 65 },
        ],
        ascendants: [{ over75: true, disability: 33 }],
        ccaaId: 'madrid',
      }),
      NO_DRAFT
    );
    expect(s).toMatchObject({
      childAges: [2, 9],
      ascendants: 1,
      disability: true,
      age: 67,
      ownDisability: 33,
      childDisability: true,
      ascendantDisability: true,
      ascendantOver75: true,
      ccaaId: 'madrid',
    });
    const empty = situationOf(form({ age: ' ' }), NO_DRAFT);
    expect(empty).toMatchObject({ disability: false, age: null, ccaaId: undefined });
  });

  it('reads the home from the guided question, else from the draft, else not known', () => {
    const housing = (answer: string) =>
      situationOf(form({ answers: { housing: answer } }), NO_DRAFT);
    expect(housing('rent')).toMatchObject({ rents: true, mortgage: false });
    expect(housing('both')).toMatchObject({ rents: true, mortgage: true });
    expect(housing('mortgage')).toMatchObject({ rents: false, mortgage: true });
    expect(housing('no')).toMatchObject({ rents: false, mortgage: false });
    expect(situationOf(form(), NO_DRAFT)).toMatchObject({ rents: null, mortgage: null });
    expect(situationOf(form(), { reading, rents: false }).rents).toBe(false);
    expect(situationOf(form(), { reading, rents: true }).rents).toBe(true);
    expect(situationOf(form({ rentalOn: true }), NO_DRAFT).landlord).toBe(true);
    expect(
      situationOf(form({ unrented: [{ value: '1', revised: false, days: '' }] }), NO_DRAFT).landlord
    ).toBe(true);
  });

  it('reads the work, the benefits and the joint return', () => {
    expect(situationOf(form(), NO_DRAFT)).toMatchObject({ works: true, gross: 30000 });
    expect(situationOf(form({ gross: '' }), NO_DRAFT).works).toBeNull();
    expect(situationOf(form({ retired: true }), NO_DRAFT).works).toBe(false);
    expect(situationOf(form({ nonSalary: '30000' }), NO_DRAFT).works).toBe(false);
    const income = (answer: string) =>
      situationOf(form({ answers: { income: answer } }), NO_DRAFT).benefits;
    expect(income('benefits')).toBe(true);
    expect(income('mixed')).toBe(true);
    expect(income('work')).toBe(false);
    expect(income('pension')).toBe(false);
    expect(situationOf(form(), NO_DRAFT).benefits).toBeNull();
    const partner = { ...emptyForm('').partner, disability: 65 as const };
    expect(situationOf(form({ joint: 'couple', partner }), NO_DRAFT)).toMatchObject({
      spouseDisability: true,
      singleParent: false,
    });
    expect(situationOf(form({ joint: 'couple' }), NO_DRAFT).spouseDisability).toBe(false);
    expect(situationOf(form({ joint: 'single' }), NO_DRAFT)).toMatchObject({
      spouseDisability: false,
      singleParent: true,
    });
    expect(situationOf(form({ joint: 'none' }), NO_DRAFT)).toMatchObject({
      spouseDisability: null,
      singleParent: null,
    });
  });
});

const ded = (id: string, over: Partial<Deduction> = {}): Deduction => ({
  id,
  group: 'health',
  title: id,
  summary: 's',
  kind: 'fixed',
  amount: 100,
  requirements: 'r',
  url: 'u',
  ...over,
});
const saving = (n: number) => ({ saving: n, blocked: false, example: null });
const RESULT = {
  taxBase: 30000,
  savingsBase: 0,
  minimum: { total: 5550 },
} as unknown as RentaResult;

describe('the deductions to go through', () => {
  it('puts the State first, then the community, each by the highest saving', () => {
    const list = [ded('madrid-a'), ded('estado-b'), ded('madrid-c'), ded('estado-d')];
    const savings = { 'madrid-a': saving(10), 'estado-b': saving(5), 'madrid-c': saving(50) };
    expect(reviewOrder(list, savings).map((d) => d.id)).toEqual([
      'estado-b',
      'estado-d',
      'madrid-c',
      'madrid-a',
    ]);
  });

  it('leaves out the marked ones and the ones in the draft, and apart the ones over the income limit', () => {
    const list = [
      ded('estado-a'),
      ded('estado-b'),
      ded('estado-c'),
      ded('estado-d', { incomeLimit: { individual: 20000, note: 'Hasta 20.000 €' } }),
      ded('estado-e', { group: 'other', title: 'Inversión en empresas' }),
    ];
    const review = reviewOf(list, situationOf(form(), NO_DRAFT), {
      result: RESULT,
      savings: {},
      choices: { 'estado-a': { on: true, amount: '', units: '' } },
      mentioned: ['estado-b'],
    });
    expect(review.candidates.map((d) => d.id)).toEqual(['estado-c']);
    expect(review.outOfReach.map((d) => d.id)).toEqual(['estado-d']);
  });

  it('keeps each decision once: dismissed, later, or neither once marked', () => {
    const later = decide(NO_REVIEW, 'a', 'later');
    expect(later).toEqual({ dismissed: [], later: ['a'] });
    const dismissed = decide(later, 'a', 'dismissed');
    expect(dismissed).toEqual({ dismissed: ['a'], later: [] });
    expect(decide(dismissed, 'a', 'marked')).toEqual(NO_REVIEW);
  });

  it('goes through the undecided ones first, the ones left for later at the end', () => {
    const list = [ded('a'), ded('b'), ded('c'), ded('d')];
    const review = { dismissed: ['c'], later: ['a'] };
    expect(queueOf(list, review, ['c', 'd'])).toEqual(['b', 'a']);
  });

  it('asks for an amount for a percentage or a special deduction', () => {
    expect(needsAmount(ded('a', { kind: 'percent' }))).toBe(true);
    expect(needsAmount(ded('a', { kind: 'special' }))).toBe(true);
    expect(needsAmount(ded('a'))).toBe(false);
  });
});
