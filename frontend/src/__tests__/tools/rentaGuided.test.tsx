import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { PROGRESS_KEY, PROGRESS_VERSION } from '@modules/tools/application/rentaProgress';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import { QUESTIONS } from '@modules/tools/domain/rentaGuide';
import { rentaState } from '@modules/tools/data/renta/state';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

beforeEach(() => localStorage.clear());

const local = () => renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
/** Premium in the app: the result is live, so the joint table can be seen without calculating. */
const premium = () => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(
    f.billing({
      plan: 'premium',
      renta: { draft: { allowed: true, reason: 'premium' }, eligibleOn: null, passUntil: null },
    })
  );
  return renderWithProviders(<RentaPlanner mode="account" />, { api, plan: true });
};

const question = (n: number) =>
  screen.getByText(tr('tools.renta.guide.progress', { n, total: QUESTIONS.length }));
const legend = (q: string) => screen.getByText(tr(`tools.renta.guide.q.${q}`));
const next = () =>
  fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.guide.next') }));
const nextButton = () => screen.getByRole('button', { name: tr('tools.renta.guide.next') });
const pick = (q: string, option: string) =>
  fireEvent.click(screen.getByRole('radio', { name: tr(`tools.renta.guide.opt.${q}.${option}`) }));
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Saved progress, as the planner leaves it on the device. */
const saved = (form: Partial<RentaForm>) =>
  localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({
      version: PROGRESS_VERSION,
      year: rentaState.year,
      form: { ...emptyForm(''), ...form },
      draft: null,
    })
  );
const ALL_NO = {
  income: 'work',
  disability: '0',
  family: 'no',
  joint: 'none',
  property: 'no',
  savings: 'no',
  plan: 'no',
  housing: 'no',
};

describe('guided questions: one at a time', () => {
  it('opens on the first question, with its reason, a progress bar and the focus left alone', () => {
    local();
    expect(question(1)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
    expect(screen.getByRole('group', { name: tr('tools.renta.guide.q.ccaa') })).toBeInTheDocument();
    expect(screen.getByText(tr('tools.renta.guide.why.ccaa'))).toBeInTheDocument();
    expect(legend('ccaa')).not.toHaveFocus();
    // The full form is not on the page: only the question.
    expect(screen.queryByText(tr('tools.renta.step1'))).toBeNull();
    expect(screen.queryByRole('button', { name: tr('tools.renta.guide.back') })).toBeNull();
    expect(nextButton()).toBeDisabled();
  });

  it('asks for the community, warns about the foral ones and about one that cannot load', async () => {
    local();
    const select = screen.getByLabelText(tr('tools.renta.ccaa'));
    fireEvent.change(select, { target: { value: 'navarra' } });
    expect(
      await screen.findByText(/régimen foral/, { selector: '.renta-foral' })
    ).toBeInTheDocument();
    const option = document.createElement('option');
    option.value = 'atlantida';
    select.append(option);
    fireEvent.change(select, { target: { value: 'atlantida' } });
    expect(await screen.findByText(tr('tools.renta.loadError'))).toBeInTheDocument();
  });

  it('moves on with Next or Enter, puts the focus on the question and goes back', () => {
    local();
    fireEvent.change(screen.getByLabelText(tr('tools.renta.ccaa')), {
      target: { value: 'castilla-y-leon' },
    });
    next();
    expect(question(2)).toBeInTheDocument();
    expect(legend('age')).toHaveFocus();
    // A believable age: not empty, not over 120.
    type(tr('tools.renta.age'), '');
    expect(nextButton()).toBeDisabled();
    type(tr('tools.renta.age'), '130');
    expect(nextButton()).toBeDisabled();
    type(tr('tools.renta.age'), '65');
    fireEvent.submit(screen.getByLabelText(tr('tools.renta.age')).closest('form') as HTMLElement);
    expect(question(3)).toBeInTheDocument();
    expect(screen.getByText(tr('tools.renta.guide.keys'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.guide.back') }));
    expect(screen.getByLabelText(tr('tools.renta.age'))).toHaveValue('65');
  });
});

describe('guided questions: income and disability', () => {
  const atIncome = () => {
    saved({
      ccaaId: 'castilla-y-leon',
      age: '65',
      answers: { ccaa: 'castilla-y-leon', age: '65' },
    });
    local();
    expect(legend('income')).toBeInTheDocument();
  };

  it('asks the amounts once the kind of income is known, and how much is a pension in a mix', () => {
    atIncome();
    expect(screen.queryByLabelText(tr('tools.renta.guide.grossAll'))).toBeNull();
    expect(nextButton()).toBeDisabled();
    // A salary asks for the salary.
    pick('income', 'work');
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toBeInTheDocument();
    pick('income', 'mixed');
    type(tr('tools.renta.guide.grossAll'), '18379.04');
    type(tr('tools.renta.guide.nonSalary'), '1630.99');
    type(tr('tools.renta.socialSecurity'), '1235.98');
    type(tr('tools.renta.withheld'), '1182.42');
    expect(
      screen.getByRole('radio', { name: tr('tools.renta.guide.opt.income.mixed') })
    ).toBeChecked();
    // A pension only: the whole gross is a pension, and it follows the gross.
    pick('income', 'pension');
    expect(screen.queryByLabelText(tr('tools.renta.guide.nonSalary'))).toBeNull();
    type(tr('tools.renta.guide.grossAll'), '12000');
    fireEvent.click(screen.getByRole('switch', { name: tr('tools.renta.view.expert') }));
    expect(screen.getByLabelText(tr('tools.renta.nonSalary'))).toHaveValue('12000');
    expect(screen.getByLabelText(tr('tools.renta.retired'))).toBeChecked();
  });

  it('asks whether the person works only for a mix with a disability, and needs the answer', () => {
    atIncome();
    pick('income', 'mixed');
    type(tr('tools.renta.guide.grossAll'), '18379.04');
    type(tr('tools.renta.guide.nonSalary'), '1630.99');
    next();
    expect(legend('disability')).toHaveFocus();
    expect(screen.queryByText(tr('tools.renta.guide.q.active'))).toBeNull();
    pick('disability', '33');
    expect(
      screen.getByRole('group', { name: tr('tools.renta.guide.q.active') })
    ).toBeInTheDocument();
    expect(nextButton()).toBeDisabled();
    pick('active', 'no');
    expect(nextButton()).toBeEnabled();
    next();
    expect(legend('family')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: tr('tools.renta.view.expert') }));
    expect(screen.getByLabelText(tr('tools.renta.retired'))).toBeChecked();
    expect(screen.getByLabelText(tr('tools.renta.ownDisability'))).toHaveValue('33');
  });

  it('says what a disability means for a worker and for a pensioner without asking', () => {
    atIncome();
    pick('income', 'work');
    next();
    pick('disability', '65');
    expect(screen.getByText(tr('tools.renta.guide.isActive'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.guide.back') }));
    pick('income', 'pension');
    next();
    expect(screen.getByText(tr('tools.renta.guide.notActive'))).toBeInTheDocument();
    pick('disability', '0');
    expect(screen.queryByText(tr('tools.renta.guide.notActive'))).toBeNull();
  });
});

describe('guided questions: family, joint return, property, savings, plan and housing', () => {
  const at = (q: string) => {
    const before = Object.fromEntries(
      QUESTIONS.slice(0, QUESTIONS.indexOf(q as (typeof QUESTIONS)[number])).map((k) => [
        k,
        k === 'ccaa' ? 'castilla-y-leon' : k === 'age' ? '40' : ALL_NO[k as keyof typeof ALL_NO],
      ])
    );
    saved({ ccaaId: 'castilla-y-leon', gross: '30000', answers: before });
    local();
    expect(legend(q)).toBeInTheDocument();
  };

  it('family: the children and relatives only after a yes', () => {
    at('family');
    expect(screen.queryByText(tr('tools.renta.children'))).toBeNull();
    pick('family', 'yes');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('tools.renta.addChild')) }));
    type(tr('tools.renta.childAge', { n: 1 }), '7');
    // Adding a child does not submit the question.
    expect(legend('family')).toBeInTheDocument();
    expect(screen.getByText(tr('tools.renta.ascendants'))).toBeInTheDocument();
    pick('family', 'no');
    expect(screen.queryByText(tr('tools.renta.children'))).toBeNull();
    pick('family', 'yes');
    expect(screen.queryByLabelText(tr('tools.renta.childAge', { n: 1 }))).toBeNull();
  });

  it('joint return: the spouse with a couple, and the other parent for one parent alone', () => {
    at('joint');
    pick('joint', 'couple');
    type(tr('tools.renta.joint.gross'), '9000');
    expect(screen.getByLabelText(tr('tools.renta.joint.socialSecurity'))).toHaveAttribute(
      'placeholder',
      '585'
    );
    pick('joint', 'single');
    expect(screen.queryByLabelText(tr('tools.renta.joint.gross'))).toBeNull();
    // No minor child yet: there is no single-parent unit.
    expect(screen.getByRole('alert')).toHaveTextContent(tr('tools.renta.joint.noMinor'));
    fireEvent.click(screen.getByLabelText(tr('tools.renta.joint.otherParent')));
    expect(screen.getByLabelText(tr('tools.renta.joint.otherParent'))).toBeChecked();
    pick('joint', 'none');
    expect(screen.queryByLabelText(tr('tools.renta.joint.otherParent'))).toBeNull();
  });

  it('property: the rent without a second check box, and the properties at disposal', () => {
    at('property');
    pick('property', 'rented');
    const income = tr('tools.renta.property.field.income');
    expect(screen.getByLabelText(income)).toBeInTheDocument();
    expect(screen.queryByLabelText(tr('tools.renta.rentalOn'))).toBeNull();
    pick('property', 'other');
    expect(screen.queryByLabelText(income)).toBeNull();
    expect(screen.getByText(tr('tools.renta.cadastral', { n: 1 }))).toBeInTheDocument();
    pick('property', 'no');
    expect(screen.queryByText(tr('tools.renta.cadastral', { n: 1 }))).toBeNull();
  });

  it('savings and pension plan: the amounts after a yes', () => {
    at('savings');
    pick('savings', 'yes');
    type(tr('tools.renta.savings'), '300');
    next();
    expect(legend('plan')).toBeInTheDocument();
    pick('plan', 'yes');
    type(tr('tools.renta.pension'), '1000');
    type(tr('tools.renta.pensionEmployer'), '200');
    expect(screen.getByLabelText(tr('tools.renta.pension'))).toHaveValue('1000');
    pick('plan', 'no');
    expect(screen.queryByLabelText(tr('tools.renta.pension'))).toBeNull();
  });

  it('housing: what was paid, and the deductions it can give, ticked in the list below too', async () => {
    at('housing');
    expect(screen.getByRole('button', { name: tr('tools.renta.guide.finish') })).toBeDisabled();
    pick('housing', 'rent');
    type(tr('tools.renta.guide.paid.rent'), '6000');
    const guide = document.querySelector('.renta-guide') as HTMLElement;
    const transitional = within(guide).getByRole('checkbox', {
      name: /Alquiler de vivienda habitual con contrato anterior a 2015/,
    });
    fireEvent.click(transitional);
    expect(transitional).toBeChecked();
    type(tr('tools.renta.guide.paid.rent'), '6500');
    const row = document.getElementById('renta-ded-estado-alquiler-transitorio') as HTMLElement;
    expect(row).toHaveClass('renta-deduction--on');
    expect(within(row).getAllByRole('textbox')[0]).toHaveValue('6500');
    pick('housing', 'both');
    expect(screen.getByLabelText(tr('tools.renta.guide.paid.mortgage'))).toBeInTheDocument();
    pick('housing', 'mortgage');
    expect(row).not.toHaveClass('renta-deduction--on');
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.guide.finish') }));
    expect(await screen.findByText(tr('tools.renta.guide.summary'))).toHaveFocus();
  });
});

describe('guided questions: the summary', () => {
  const answered = (over: Partial<RentaForm> = {}) =>
    saved({
      ccaaId: 'castilla-y-leon',
      age: '65',
      gross: '18000',
      nonSalary: '1600',
      disability: 33,
      retired: true,
      children: [{ age: '4', disability: 0 }],
      joint: 'couple',
      partner: { ...emptyForm('').partner, gross: '9000' },
      answers: {
        ...ALL_NO,
        ccaa: 'castilla-y-leon',
        age: '65',
        income: 'mixed',
        disability: '33',
        active: 'no',
        family: 'yes',
        joint: 'couple',
      },
      ...over,
    });

  it('says in a few words what was understood, and changes one answer to come back', () => {
    answered();
    local();
    const summary = screen.getByText(tr('tools.renta.guide.summary')).closest('div') as HTMLElement;
    expect(summary).toHaveTextContent('Castilla y León');
    expect(summary).toHaveTextContent(tr('tools.renta.guide.years', { age: '65' }));
    expect(summary).toHaveTextContent(`${tr('tools.renta.guide.opt.income.mixed')} · 18.000,00 €`);
    expect(summary).toHaveTextContent(
      `${tr('tools.renta.guide.opt.disability.33')} · ${tr('tools.renta.guide.opt.active.no')}`
    );
    expect(summary).toHaveTextContent(
      tr('tools.renta.guide.familyCount', { children: 1, ascendants: 0 })
    );
    expect(summary).toHaveTextContent(`${tr('tools.renta.guide.opt.joint.couple')} · 9.000,00 €`);
    expect(summary).toHaveTextContent(tr('tools.renta.guide.opt.housing.no'));
    fireEvent.click(
      screen.getByRole('button', {
        name: tr('tools.renta.guide.changeOne', {
          question: tr('tools.renta.guide.short.savings'),
        }),
      })
    );
    expect(legend('savings')).toHaveFocus();
    pick('savings', 'yes');
    type(tr('tools.renta.savings'), '50');
    next();
    expect(screen.getByText(tr('tools.renta.guide.summary'))).toHaveFocus();
    expect(screen.getByText(tr('tools.renta.guide.summary')).closest('div')).toHaveTextContent(
      tr('tools.renta.guide.opt.savings.yes')
    );
  });

  it('says what has no answer, and an active worker with a disability', () => {
    answered({
      ccaaId: '',
      retired: false,
      disability: 65,
      answers: { ...ALL_NO, ccaa: 'x', age: '65', disability: '65' },
    });
    local();
    const summary = screen.getByText(tr('tools.renta.guide.summary')).closest('div') as HTMLElement;
    expect(summary).toHaveTextContent(tr('tools.renta.guide.notAnswered'));
    expect(summary).toHaveTextContent(
      `${tr('tools.renta.guide.opt.disability.65')} · ${tr('tools.renta.guide.opt.active.yes')}`
    );
  });

  it('opens where it was left, and keeps an answer given in expert mode', () => {
    saved({ ccaaId: 'madrid', answers: { ccaa: 'madrid' } });
    local();
    expect(question(2)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: tr('tools.renta.view.expert') }));
    expect(localStorage.getItem('mm_renta_view')).toBe('expert');
    expect(screen.getByText(tr('tools.renta.view.expertHint'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('tools.renta.age')), { target: { value: '70' } });
    fireEvent.click(screen.getByRole('switch', { name: tr('tools.renta.view.expert') }));
    expect(localStorage.getItem('mm_renta_view')).toBe('guided');
    expect(screen.getByLabelText(tr('tools.renta.age'))).toHaveValue('70');
  });
});

describe('the joint return in the result', () => {
  it('compares two individual returns with the joint one, with the warning', async () => {
    saved({
      ccaaId: 'castilla-y-leon',
      gross: '30000',
      socialSecurity: '1950',
      withheld: '4000',
      children: [
        { age: '8', disability: 0 },
        { age: '5', disability: 0 },
      ],
      joint: 'couple',
      answers: { ccaa: 'castilla-y-leon' },
    });
    premium();
    const table = await screen.findByRole('region', { name: tr('tools.renta.joint.compareTitle') });
    expect(within(table).getByRole('status')).toHaveTextContent(
      tr('tools.renta.joint.best.joint', { amount: '1.457,75 €' })
    );
    for (const col of ['you', 'partner', 'sum', 'joint']) {
      expect(
        within(table).getByRole('columnheader', { name: tr(`tools.renta.joint.col.${col}`) })
      ).toBeInTheDocument();
    }
    const result = within(table).getByRole('row', {
      name: new RegExp(tr('tools.renta.joint.row.result')),
    });
    expect(result).toHaveTextContent('-1.096,50 €');
    expect(table).toHaveTextContent(
      tr('tools.renta.joint.note.childrenToOne', {
        who: tr('tools.renta.joint.to.you'),
        amount: '-110,50 €',
      })
    );
    expect(within(table).getByRole('note')).toHaveTextContent(tr('tools.renta.joint.warning'));
  });

  it('notes the doubts of two earners: one 2,000 € for the unit and the 340 €', async () => {
    saved({
      ccaaId: 'castilla-y-leon',
      gross: '16000',
      socialSecurity: '1040',
      joint: 'couple',
      partner: { ...emptyForm('').partner, gross: '15000', socialSecurity: '975' },
      answers: { ccaa: 'castilla-y-leon' },
    });
    premium();
    const table = await screen.findByRole('region', { name: tr('tools.renta.joint.compareTitle') });
    expect(table).toHaveTextContent(
      tr('tools.renta.joint.best.individual', { amount: '3.538,15 €' })
    );
    expect(table).toHaveTextContent(tr('tools.renta.joint.note.lowPay', { amount: '54,95 €' }));
    expect(table).toHaveTextContent(/si contara uno solo, la conjunta saldría/);
  });

  it('shows one parent without a spouse column, and nothing without a minor child', async () => {
    saved({
      ccaaId: 'castilla-y-leon',
      gross: '25000',
      socialSecurity: '1625',
      otherParent: true,
      children: [{ age: '8', disability: 0 }],
      joint: 'single',
      answers: { ccaa: 'castilla-y-leon' },
    });
    premium();
    const table = await screen.findByRole('region', { name: tr('tools.renta.joint.compareTitle') });
    expect(
      within(table).queryByRole('columnheader', { name: tr('tools.renta.joint.col.partner') })
    ).toBeNull();
    expect(within(table).getByRole('status')).toHaveTextContent(tr('tools.renta.joint.best.same'));
    expect(table).toHaveTextContent(tr('tools.renta.joint.note.single', { amount: '0,00 €' }));
    // A child of 20 makes no single-parent unit: the comparison goes away.
    fireEvent.click(screen.getByRole('switch', { name: tr('tools.renta.view.expert') }));
    fireEvent.change(screen.getByLabelText(tr('tools.renta.childAge', { n: 1 })), {
      target: { value: '20' },
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: tr('tools.renta.joint.compareTitle') })
      ).toBeNull()
    );
  });
});

describe('the joint return in expert mode', () => {
  it('asks for the spouse with every field, and for the other parent', async () => {
    localStorage.setItem('mm_renta_view', 'expert');
    premium();
    const select = await screen.findByLabelText(tr('tools.renta.joint.question'));
    expect(select).toHaveValue('none');
    fireEvent.change(select, { target: { value: 'couple' } });
    for (const [key, value] of [
      ['gross', '20000'],
      ['socialSecurity', '1300'],
      ['withheld', '1500'],
      ['nonSalary', '0'],
      ['age', '70'],
      ['savings', '10'],
      ['pension', '100'],
    ]) {
      type(tr(`tools.renta.joint.${key}`), value);
      expect(screen.getByLabelText(tr(`tools.renta.joint.${key}`))).toHaveValue(value);
    }
    fireEvent.change(screen.getByLabelText(tr('tools.renta.joint.disability')), {
      target: { value: '33' },
    });
    fireEvent.click(screen.getByLabelText(tr('tools.renta.joint.retired')));
    expect(screen.getByLabelText(tr('tools.renta.joint.retired'))).toBeChecked();
    expect(
      await screen.findByRole('region', { name: tr('tools.renta.joint.compareTitle') })
    ).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'single' } });
    expect(screen.getByLabelText(tr('tools.renta.joint.otherParent'))).toBeInTheDocument();
  });
});

describe('guided questions and the draft', () => {
  const DRAFT = `Comunitat Valenciana Fecha de nacimiento 20/06/1994 0010
  Total ingresos íntegros computables 30.000,00 0012
  Total pagos a cuenta 4.100,00 0609 Fecha de nacimiento 12/03/2023 0077`;

  it('fills in and marks the questions the draft answers', async () => {
    premium();
    fireEvent.click(await screen.findByText(tr('tools.renta.draft.paste')));
    fireEvent.change(
      screen.getByLabelText(tr('tools.renta.draft.paste'), { selector: 'textarea' }),
      {
        target: { value: DRAFT },
      }
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.draft.read') }));
    });
    expect(await screen.findByText(tr('tools.renta.guide.fromDraft'))).toBeInTheDocument();
    expect(screen.getByLabelText(tr('tools.renta.ccaa'))).toHaveValue('comunitat-valenciana');
    // The questions are answered as the person goes: the summary shows what came from the draft.
    next();
    next();
    pick('income', 'work');
    next();
    next();
    next();
    pick('joint', 'none');
    next();
    pick('property', 'no');
    next();
    pick('savings', 'no');
    next();
    pick('plan', 'no');
    next();
    pick('housing', 'no');
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.guide.finish') }));
    const summary = screen.getByText(tr('tools.renta.guide.summary')).closest('div') as HTMLElement;
    expect(within(summary).getAllByText(tr('tools.renta.guide.fromDraft')).length).toBeGreaterThan(
      1
    );
  });
});

describe('guided questions in English', () => {
  it('speaks English', () => {
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false, locale: 'en' });
    expect(screen.getByText('Which region do you live in?')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Expert mode (every field)' })).not.toBeChecked();
  });
});

describe('guided questions: a self-employed person', () => {
  const activity = {
    kind: 'given',
    name: 'Autónomos',
    data: { area: 'direct', net: 15000 },
    withheld: 0,
    payments: 0,
  } as NonNullable<RentaForm['activities']>[number];
  const atIncome = (form: Partial<RentaForm>) =>
    saved({ ccaaId: 'madrid', age: '40', answers: { ccaa: 'madrid', age: '40' }, ...form });

  it('with only an activity asks for no pay, and says where the activity goes', () => {
    atIncome({});
    local();
    pick('income', 'self');
    expect(screen.getByText(tr('tools.renta.guide.selfHow'))).toBeInTheDocument();
    expect(screen.queryByLabelText(tr('tools.renta.gross'))).toBeNull();
  });

  it('with a pay and an activity asks for the pay and says the activity is there', () => {
    atIncome({ activities: [activity], gross: '20000' });
    local();
    expect(
      screen.getByRole('radio', { name: tr('tools.renta.guide.opt.income.workSelf') })
    ).toBeChecked();
    expect(screen.getByText(tr('tools.renta.guide.selfBrought'))).toBeInTheDocument();
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('20000');
    pick('income', 'self');
    expect(screen.queryByLabelText(tr('tools.renta.gross'))).toBeNull();
  });

  it('a pay and an activity picked before bringing it: asks for the pay and where it goes', () => {
    atIncome({});
    local();
    pick('income', 'workSelf');
    expect(screen.getByText(tr('tools.renta.guide.selfHow'))).toBeInTheDocument();
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toBeInTheDocument();
  });

  it('the summary says «only my activity» without an amount of pay', () => {
    saved({
      ccaaId: 'madrid',
      age: '40',
      activities: [activity],
      answers: { ...ALL_NO, ccaa: 'madrid', age: '40', income: 'self' },
    });
    local();
    const summary = screen.getByText(tr('tools.renta.guide.summary')).closest('div') as HTMLElement;
    expect(summary).toHaveTextContent(tr('tools.renta.guide.opt.income.self'));
    expect(summary).not.toHaveTextContent(`${tr('tools.renta.guide.opt.income.self')} ·`);
  });
});
