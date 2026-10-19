import type { Deduction } from '@modules/tools/domain/rentaData';
import type { DraftReading } from '@modules/tools/domain/rentaDraft';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import {
  QUESTIONS,
  answerOf,
  asksActive,
  choose,
  draftAnswers,
  firstOpen,
  grossPatch,
  housingDeductions,
  isAnswered,
  paidPatch,
  tickHousing,
} from '@modules/tools/domain/rentaGuide';

const form = (over: Partial<RentaForm> = {}): RentaForm => ({ ...emptyForm(''), ...over });

const deduction = (id: string, over: Partial<Deduction> = {}): Deduction => ({
  id,
  group: 'housing',
  title: id,
  summary: '',
  kind: 'percent',
  requirements: '',
  url: 'https://example.test',
  ...over,
});

const RENT = deduction('madrid-arrendamiento-vivienda-habitual');
const RENT_SPECIAL = deduction('baleares-alquiler-vivienda-habitual', { kind: 'special' });
const LANDLORD = deduction('madrid-arrendamiento-viviendas-vacias', { kind: 'fixed' });
const SOCIAL = deduction('aragon-arrendamiento-vivienda-social', { group: 'other' });
const MORTGAGE = deduction('estado-vivienda-habitual-transitorio');
const MORTGAGE_REGION = deduction('cataluna-tramo-autonomico-vivienda-habitual', {
  kind: 'special',
});
const ALL = [RENT, RENT_SPECIAL, LANDLORD, SOCIAL, MORTGAGE, MORTGAGE_REGION];

const reading = (over: Partial<DraftReading> = {}): DraftReading => ({
  ccaaId: null,
  gross: null,
  socialSecurity: null,
  withheld: null,
  pension: null,
  rentalIncome: null,
  savings: null,
  childAges: [],
  ascendantAges: [],
  age: null,
  ownsHome: false,
  applied: [],
  exercise: null,
  disability: null,
  unrented: [],
  boxes: {},
  ...over,
});

describe('the housing deductions of the guided question', () => {
  it('asks about the tenant ones, not the landlord ones, and the mortgages before 2013', () => {
    expect(housingDeductions(ALL, 'rent')).toEqual([RENT, RENT_SPECIAL]);
    expect(housingDeductions(ALL, 'mortgage')).toEqual([MORTGAGE, MORTGAGE_REGION]);
  });
});

describe('the answer of each question', () => {
  it('reads the community and the age from the form', () => {
    expect(answerOf(form(), 'ccaa')).toBeNull();
    expect(answerOf(form({ ccaaId: 'madrid' }), 'ccaa')).toBe('madrid');
    expect(answerOf(form({ age: ' ' }), 'age')).toBeNull();
    expect(answerOf(form({ age: '65' }), 'age')).toBe('65');
  });

  it('tells the kind of income from the amounts, and keeps the pick where they cannot tell', () => {
    expect(answerOf(form(), 'income')).toBeNull();
    expect(answerOf(form({ answers: { income: 'benefits' } }), 'income')).toBe('benefits');
    expect(answerOf(form({ gross: '20000' }), 'income')).toBe('work');
    expect(answerOf(form({ gross: '20000', nonSalary: '2000' }), 'income')).toBe('mixed');
    expect(answerOf(form({ gross: '20000', nonSalary: '20000' }), 'income')).toBe('pension');
    // A pension and benefits are the same amounts: the pick says which.
    const benefits = form({ gross: '9000', nonSalary: '9000', answers: { income: 'benefits' } });
    expect(answerOf(benefits, 'income')).toBe('benefits');
    // A mix picked before saying how much of it is a pension.
    expect(answerOf(form({ gross: '9000', answers: { income: 'mixed' } }), 'income')).toBe('mixed');
    // The expert mode typed something else: the amounts win.
    const typed = form({ gross: '9000', nonSalary: '100', answers: { income: 'work' } });
    expect(answerOf(typed, 'income')).toBe('mixed');
  });

  it('reads the family, the joint return and the property from the form', () => {
    expect(answerOf(form({ disability: 65 }), 'disability')).toBe('65');
    expect(answerOf(form(), 'family')).toBeNull();
    expect(answerOf(form({ answers: { family: 'no' } }), 'family')).toBe('no');
    expect(answerOf(form({ ascendants: [{ over75: true, disability: 0 }] }), 'family')).toBe('yes');
    expect(answerOf(form(), 'joint')).toBeNull();
    expect(answerOf(form({ joint: 'couple' }), 'joint')).toBe('couple');
    const row = { value: '1', revised: false, months: '' };
    expect(answerOf(form(), 'property')).toBeNull();
    expect(answerOf(form({ answers: { property: 'rented' } }), 'property')).toBe('no');
    expect(answerOf(form({ rentalOn: true }), 'property')).toBe('rented');
    expect(answerOf(form({ rentalOn: true, unrented: [row] }), 'property')).toBe('both');
    expect(answerOf(form({ unrented: [row] }), 'property')).toBe('other');
  });

  it('reads savings, the pension plan and housing', () => {
    expect(answerOf(form(), 'savings')).toBeNull();
    expect(answerOf(form({ savings: '10' }), 'savings')).toBe('yes');
    expect(answerOf(form({ answers: { savings: 'yes' } }), 'savings')).toBe('yes');
    expect(answerOf(form(), 'plan')).toBeNull();
    expect(answerOf(form({ pensionEmployer: '100' }), 'plan')).toBe('yes');
    expect(answerOf(form(), 'housing')).toBeNull();
    expect(answerOf(form({ answers: { housing: 'rent' } }), 'housing')).toBe('rent');
  });
});

describe('where the interview goes on', () => {
  it('opens at the first question not answered, and at the summary when all are', () => {
    expect(firstOpen(form())).toBe(0);
    expect(firstOpen(form({ answers: { ccaa: 'madrid', age: '40' } }))).toBe(2);
    const all = Object.fromEntries(QUESTIONS.map((q) => [q, 'no']));
    expect(firstOpen(form({ answers: all }))).toBe(QUESTIONS.length);
    expect(isAnswered(form({ answers: { plan: 'no' } }), 'plan')).toBe(true);
  });
});

describe('asking whether the person works', () => {
  it('asks only with a disability and pay that may or may not be from a job', () => {
    expect(asksActive(form({ disability: 0, gross: '9000', answers: { income: 'mixed' } }))).toBe(
      false
    );
    expect(asksActive(form({ disability: 33, gross: '9000', answers: { income: 'mixed' } }))).toBe(
      true
    );
    expect(asksActive(form({ disability: 33 }))).toBe(true);
    expect(asksActive(form({ disability: 33, gross: '9000' }))).toBe(false);
  });
});

describe('what each answer changes in the form', () => {
  it('income: a pension keeps all the gross out of the 340 € and is not an active worker', () => {
    const base = form({ gross: '12000', nonSalary: '500', retired: false });
    expect(choose(base, 'income', 'pension')).toEqual({
      answers: { income: 'pension' },
      nonSalary: '12000',
      retired: true,
    });
    expect(choose(base, 'income', 'benefits')).toMatchObject({ nonSalary: '12000', retired: true });
    expect(choose({ ...base, retired: true }, 'income', 'work')).toMatchObject({
      nonSalary: '',
      retired: false,
    });
    // A mix keeps what was typed, and whether they work comes from the follow-up question.
    expect(choose(base, 'income', 'mixed')).toMatchObject({ nonSalary: '500', retired: false });
    const notWorking = form({ gross: '12000', retired: false, answers: { active: 'no' } });
    expect(choose(notWorking, 'income', 'mixed')).toMatchObject({ retired: true });
  });

  it('disability and the follow-up question: only an active worker gets the extra expenses', () => {
    const mixed = form({ gross: '18000', nonSalary: '1600', answers: { income: 'mixed' } });
    expect(choose(mixed, 'disability', '33')).toEqual({
      answers: { income: 'mixed', disability: '33' },
      disability: 33,
      retired: false,
    });
    expect(choose(mixed, 'active', 'no')).toMatchObject({ retired: true });
    expect(choose({ ...mixed, retired: true }, 'active', 'yes')).toMatchObject({ retired: false });
    const pension = form({ gross: '9000', nonSalary: '9000' });
    expect(choose(pension, 'disability', '65')).toMatchObject({ disability: 65, retired: true });
  });

  it('family: "no" clears the children and relatives', () => {
    const full = form({
      children: [{ age: '3', disability: 0 }],
      ascendants: [{ over75: false, disability: 0 }],
      shared: true,
    });
    expect(choose(full, 'family', 'no')).toEqual({
      answers: { family: 'no' },
      children: [],
      ascendants: [],
      shared: false,
    });
    expect(choose(full, 'family', 'yes')).toEqual({ answers: { family: 'yes' } });
  });

  it('joint: the choice, and whether the parent lives with the other one only for a single parent', () => {
    const lives = form({ otherParent: true });
    expect(choose(lives, 'joint', 'single')).toMatchObject({ joint: 'single', otherParent: true });
    expect(choose(lives, 'joint', 'couple')).toMatchObject({ joint: 'couple', otherParent: false });
  });

  it('property: turns the rent on and adds a property to fill in, or clears them', () => {
    const row = { value: '1000', revised: true, months: '6' };
    expect(choose(form(), 'property', 'rented')).toMatchObject({ rentalOn: true, unrented: [] });
    expect(choose(form(), 'property', 'other')).toMatchObject({
      rentalOn: false,
      unrented: [{ value: '', revised: false, months: '' }],
    });
    expect(choose(form({ unrented: [row] }), 'property', 'both')).toMatchObject({
      rentalOn: true,
      unrented: [row],
    });
    expect(choose(form({ rentalOn: true, unrented: [row] }), 'property', 'no')).toMatchObject({
      rentalOn: false,
      unrented: [],
    });
  });

  it('savings and pension plan: "no" clears the amounts', () => {
    expect(choose(form({ savings: '9' }), 'savings', 'no')).toMatchObject({ savings: '' });
    expect(choose(form({ savings: '9' }), 'savings', 'yes')).toEqual({
      answers: { savings: 'yes' },
    });
    expect(choose(form({ pension: '9' }), 'plan', 'no')).toMatchObject({
      pension: '',
      pensionEmployer: '',
    });
    expect(choose(form(), 'plan', 'yes')).toEqual({ answers: { plan: 'yes' } });
  });

  it('housing: turns off the deductions of what the person does not pay', () => {
    const on = { on: true, amount: '6000', units: '' };
    const current = form({
      rentPaid: '6000',
      mortgagePaid: '3000',
      choices: { [RENT.id]: on, [MORTGAGE.id]: { ...on, amount: '3000' } },
    });
    expect(choose(current, 'housing', 'rent', ALL)).toEqual({
      answers: { housing: 'rent' },
      choices: { [RENT.id]: on, [MORTGAGE.id]: { ...on, amount: '3000', on: false } },
      rentPaid: '6000',
      mortgagePaid: '',
    });
    const none = choose(current, 'housing', 'no', ALL);
    expect(none.choices?.[RENT.id].on).toBe(false);
    expect(none).toMatchObject({ rentPaid: '', mortgagePaid: '' });
    expect(choose(current, 'housing', 'both', ALL)).toMatchObject({
      rentPaid: '6000',
      mortgagePaid: '3000',
    });
    // Without the list of deductions (the community is still loading) nothing is turned off.
    expect(choose(current, 'housing', 'no').choices).toEqual(current.choices);
  });

  it('a typed question only records the answer', () => {
    expect(choose(form(), 'ccaa', 'madrid')).toEqual({ answers: { ccaa: 'madrid' } });
  });
});

describe('the gross and the housing amounts of the guided questions', () => {
  it('keeps a pension all out of the 340 € when the gross changes', () => {
    expect(grossPatch(form({ answers: { income: 'pension' } }), '9000')).toEqual({
      gross: '9000',
      nonSalary: '9000',
    });
    expect(grossPatch(form({ answers: { income: 'benefits' } }), '8000')).toMatchObject({
      nonSalary: '8000',
    });
    expect(grossPatch(form(), '9000')).toEqual({ gross: '9000' });
  });

  it('gives the rent paid to a ticked percentage deduction, not to one with its own amount', () => {
    const paid = form({ rentPaid: '7000', mortgagePaid: '2500' });
    expect(tickHousing(paid, RENT, true, 'rent').choices?.[RENT.id]).toEqual({
      on: true,
      amount: '7000',
      units: '',
    });
    const special = form({
      choices: { [RENT_SPECIAL.id]: { on: false, amount: '120', units: '' } },
    });
    expect(tickHousing(special, RENT_SPECIAL, true, 'rent').choices?.[RENT_SPECIAL.id]).toEqual({
      on: true,
      amount: '120',
      units: '',
    });
    expect(tickHousing(paid, MORTGAGE, true, 'mortgage').choices?.[MORTGAGE.id].amount).toBe(
      '2500'
    );
  });

  it('updates the ticked percentage deductions when the amount paid changes', () => {
    const on = { on: true, amount: '1', units: '' };
    const current = form({
      choices: { [RENT.id]: on, [RENT_SPECIAL.id]: on, [MORTGAGE.id]: { ...on, on: false } },
    });
    const rent = paidPatch(current, 'rent', '8000', ALL);
    expect(rent.rentPaid).toBe('8000');
    expect(rent.choices?.[RENT.id].amount).toBe('8000');
    expect(rent.choices?.[RENT_SPECIAL.id].amount).toBe('1');
    const mortgage = paidPatch(current, 'mortgage', '3000', ALL);
    expect(mortgage.mortgagePaid).toBe('3000');
    expect(mortgage.choices?.[MORTGAGE.id].amount).toBe('1');
  });
});

describe('the questions a draft answers', () => {
  it('marks only what the draft says for sure', () => {
    expect(draftAnswers(reading())).toEqual({});
    expect(
      draftAnswers(
        reading({
          ccaaId: 'madrid',
          age: 66,
          disability: 0,
          childAges: [4],
          rentalIncome: 6000,
          unrented: [{ value: 1000, revised: true, months: 12 }],
          savings: 20,
          pension: 500,
          gross: 30000,
        })
      )
    ).toEqual({
      ccaa: 'madrid',
      age: '66',
      disability: '0',
      family: 'yes',
      property: 'both',
      savings: 'yes',
      plan: 'yes',
    });
    expect(draftAnswers(reading({ rentalIncome: 1 })).property).toBe('rented');
    expect(
      draftAnswers(reading({ unrented: [{ value: 1, revised: false, months: 3 }] })).property
    ).toBe('other');
    expect(draftAnswers(reading({ ascendantAges: [80] })).family).toBe('yes');
  });
});
