import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { saveProgress } from '@modules/tools/application/rentaProgress';
import { rentaState } from '@modules/tools/data/renta/state';
import { NO_DRAFT } from '@modules/tools/domain/rentaDraft';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import { NO_REVIEW } from '@modules/tools/domain/rentaReview';
import { ASSISTANT_KEY, RentaAssistant, wizardKey } from '@modules/tools/ui/renta/RentaWizard';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import persona from '../../../../docs/casos-practicos/personas/01-asalariado-soltero-madrid/persona.json';
import couple from '../../../../docs/casos-practicos/personas/02-pareja-un-sueldo-conjunta-andalucia/persona.json';
import investor from '../../../../docs/casos-practicos/personas/p4-109-cripto-binance-ledger-staking-madrid/persona.json';

beforeEach(() => localStorage.clear());

const local = (props: Partial<Parameters<typeof RentaAssistant>[0]> = {}) =>
  renderWithProviders(<RentaAssistant mode="local" {...props} />, { authenticated: false });

/** In the app with Premium: the result is live and the draft can be read. */
const premium = (props: Partial<Parameters<typeof RentaAssistant>[0]> = {}) => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(
    f.billing({
      plan: 'premium',
      renta: { draft: { allowed: true, reason: 'premium' }, eligibleOn: null, passUntil: null },
    })
  );
  return renderWithProviders(<RentaAssistant mode="account" {...props} />, { api, plan: true });
};

const heading = (name: string) => screen.getByRole('heading', { level: 2, name });
const next = () => fireEvent.click(screen.getByRole('button', { name: `${tr('wizard.next')} →` }));
const finish = (n: number) =>
  fireEvent.click(screen.getByRole('button', { name: tr('wizard.finishStep', { n }) }));
const skip = (label = tr('wizard.skip')) =>
  fireEvent.click(screen.getByRole('button', { name: label }));
const pick = (name: string | RegExp) => fireEvent.click(screen.getByRole('radio', { name }));
const guided = (q: string, option: string) => pick(tr(`tools.renta.guide.opt.${q}.${option}`));
const own = (q: string, option: string) => pick(tr(`wizard.renta.opt.${q}.${option}`));
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Saved data of the planner, as another screen leaves it. */
const saved = (form: Partial<RentaForm>) =>
  saveProgress({
    year: rentaState.year,
    form: { ...emptyForm(''), ...form },
    draft: NO_DRAFT,
    review: NO_REVIEW,
  });
/** The assistant left at a step, with every step before it done. */
const at = (step: number, answers: Record<string, string> = {}) =>
  localStorage.setItem(
    wizardKey(rentaState.year),
    JSON.stringify({
      at: step,
      screen: 0,
      done: [
        'you',
        'family',
        'work',
        'home',
        'invest',
        'activity',
        'deductions',
        'review',
        'result',
      ].slice(0, step),
      answers,
      streak: 1,
      lastDay: '2026-01-01',
    })
  );

describe('the Renta step by step: persona 01 (single employee in Madrid)', () => {
  const form = persona.renta.declaraciones[0].form;

  it('goes through the nine steps, one locked after the other, and gives the boxes to copy', async () => {
    local();
    // 1. You and your region: the draft is a shortcut that can be skipped.
    expect(heading(tr('wizard.renta.q.draft'))).toBeInTheDocument();
    skip(tr('wizard.renta.skip.draft'));
    expect(heading(tr('tools.renta.guide.q.ccaa'))).toHaveFocus();
    expect(screen.getByText(tr('wizard.renta.missing.ccaa'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('tools.renta.ccaa')), {
      target: { value: form.ccaaId },
    });
    // The data of the region is loaded on demand.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    next();
    type(tr('tools.renta.age'), form.age);
    finish(1);
    expect(
      screen.getByText(tr('wizard.badgeWon', { badge: tr('wizard.renta.badge.you') }))
    ).toBeInTheDocument();

    // 2. Family.
    next(); // no disability: the usual answer is already picked
    guided('family', 'no');
    next();
    guided('joint', 'none');
    finish(2);

    // 3. Work and payers.
    guided('income', 'work');
    expect(screen.getByText(tr('wizard.renta.warn.gross'))).toBeInTheDocument();
    type(tr('tools.renta.gross'), form.gross);
    type(tr('tools.renta.socialSecurity'), form.socialSecurity);
    type(tr('tools.renta.withheld'), form.withheld);
    expect(screen.queryByText(tr('wizard.renta.warn.gross'))).toBeNull();
    next();
    own('payers', 'no');
    finish(3);

    // 4. Home: rent paid, but no deduction ticked (contract of 2023).
    guided('housing', 'no');
    next();
    guided('property', 'no');
    finish(4);

    // 5. Investments: none.
    expect(heading(tr('tools.renta.investCard.title'))).toBeInTheDocument();
    skip(tr('wizard.renta.skip.investImport'));
    guided('savings', 'no');
    finish(5);

    // 6. Self-employed: no.
    own('activity', 'no');
    finish(6);

    // 7. Plans, donations and others.
    guided('plan', 'no');
    next();
    own('donations', 'no');
    next();
    own('others', 'no');
    finish(7);

    // 8. The review: left for another day.
    expect(heading(tr('wizard.renta.q.review'))).toBeInTheDocument();
    skip();

    // 9. The result: one free calculation on the public page.
    const calculate = await screen.findByRole('button', { name: tr('tools.renta.calculate') });
    await act(async () => fireEvent.click(calculate));
    expect(await screen.findByText(tr('tools.renta.refund'), { exact: false })).toBeInTheDocument();
    next();
    // Box 0670 of the persona, worked out by hand: −110,17 €.
    const row = screen.getByText('0670').closest('li') as HTMLElement;
    expect(row).toHaveTextContent('110,17');
    next();
    expect(screen.getByText(tr('wizard.renta.file.1'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr('app.renta.aeat') })).toHaveAttribute(
      'href',
      'https://sede.agenciatributaria.gob.es/'
    );
    fireEvent.click(screen.getByRole('button', { name: tr('wizard.finishAll') }));

    expect(heading(tr('wizard.finaleTitle'))).toHaveFocus();
    expect(screen.getByText(tr('wizard.renta.finale'))).toBeInTheDocument();
    expect(screen.getAllByText(tr('wizard.renta.notFiled')).length).toBeGreaterThan(0);
  });
});

describe('the Renta step by step: the other paths', () => {
  it('keeps every step after the current one locked', () => {
    local();
    const route = screen.getByRole('navigation', { name: tr('wizard.route') });
    const buttons = within(route).getAllByRole('button');
    expect(buttons).toHaveLength(9);
    expect(buttons.slice(1).every((b) => b.getAttribute('aria-disabled') === 'true')).toBe(true);
  });

  it('asks for the second payers, the donations and the full list when the answer is yes', () => {
    saved({ ccaaId: 'madrid', gross: '30000', answers: { income: 'work' } });
    at(2);
    local();
    next();
    own('payers', 'yes');
    type(tr('tools.renta.secondPayers'), '2000');
    finish(3);
    expect(heading(tr('tools.renta.guide.q.housing'))).toBeInTheDocument();
  });

  it('asks the donations and shows the full list of deductions', () => {
    saved({ ccaaId: 'madrid', gross: '30000', age: '40', answers: { income: 'work' } });
    at(6);
    local();
    guided('plan', 'yes');
    type(tr('tools.renta.pension'), '1000');
    next();
    own('donations', 'yes');
    type(tr('wizard.renta.donationsAmount'), '150');
    type(tr('wizard.renta.donationsAmount'), '');
    type(tr('wizard.renta.donationsAmount'), '300');
    next();
    own('others', 'yes');
    expect(screen.getByText(tr('tools.renta.stateDeductions'))).toBeInTheDocument();
    finish(7);
    // 300 € given: 80 % of 250 and 40 % of 50 (Ley 49/2002, art. 19), said in the review.
    expect(screen.getByText(/ahorras unos/)).toHaveTextContent('220,00');
  });

  it('brings the activity from the self-employed screen', () => {
    const onOpenAutonomo = jest.fn();
    at(5);
    local({ onOpenAutonomo });
    own('activity', 'yes');
    expect(screen.getByText(tr('wizard.renta.warn.activity'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('wizard.renta.openAutonomo') }));
    expect(onOpenAutonomo).toHaveBeenCalled();
  });

  it('counts an activity already brought as answered', () => {
    saved({
      activities: [
        {
          kind: 'given',
          name: 'Diseño',
          data: { net: 12000, withheld: 0, payments: 0 },
        } as unknown as NonNullable<RentaForm['activities']>[number],
      ],
    });
    at(5);
    local();
    expect(screen.getByRole('button', { name: tr('wizard.finishStep', { n: 6 }) })).toBeEnabled();
  });

  it('opens the investments from the review and the result, until there are some', async () => {
    at(7);
    local();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.investCard.linkButton') }));
    expect(heading(tr('tools.renta.investCard.title'))).toBeInTheDocument();
  });

  it('says what is missing in the review and walks it', async () => {
    saved({ ccaaId: 'madrid', gross: '20000', age: '30', answers: { income: 'work' } });
    at(7);
    local();
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(screen.getByText(tr('wizard.renta.missing.review'))).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: tr('tools.renta.review.start') }));
    for (let i = 0; i < 40; i++) {
      const no = screen.queryAllByText(tr('tools.renta.draft.no'), {
        selector: '.renta-review button',
      })[0];
      if (!no) break;
      fireEvent.click(no);
    }
    expect(screen.queryByRole('button', { name: tr('tools.renta.review.toResult') })).toBeNull();
    finish(8);
    expect(heading(tr('wizard.renta.q.result'))).toBeInTheDocument();
    // No calculation yet: the boxes wait for it.
    skip(tr('wizard.renta.skip.result'));
    expect(screen.getByText(tr('wizard.renta.boxesFirst'))).toBeInTheDocument();
  });
});

describe('the savings and the investments', () => {
  it('asks the savings, with the way back to the importer', () => {
    at(4);
    local();
    skip(tr('wizard.renta.skip.investImport'));
    guided('savings', 'yes');
    type(tr('tools.renta.savings'), '300');
    expect(screen.getByLabelText(tr('tools.renta.savings'))).toHaveValue('300');
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.investCard.linkButton') }));
    expect(heading(tr('tools.renta.investCard.title'))).toBeInTheDocument();
  });

  it('links the importer from the result', () => {
    at(8);
    local();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.investCard.linkButton') }));
    expect(heading(tr('tools.renta.investCard.title'))).toBeInTheDocument();
  });
});

describe('the boxes to copy, in the app with Premium', () => {
  it('copies an amount, and says when the clipboard refuses', async () => {
    saved({
      ccaaId: 'madrid',
      gross: '28000',
      withheld: '4200',
      age: '34',
      answers: { income: 'work' },
    });
    at(8);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onHowToFile = jest.fn();
    premium({ onHowToFile });
    expect(await screen.findByText(tr('tools.renta.refund'), { exact: false })).toBeInTheDocument();
    next();
    await act(async () =>
      fireEvent.click(
        screen.getByRole('button', { name: tr('wizard.renta.copyBox', { box: '0003' }) })
      )
    );
    expect(writeText).toHaveBeenCalledWith('28000,00');
    expect(
      screen.getByRole('button', { name: tr('wizard.renta.copyBox', { box: '0003' }) })
    ).toHaveTextContent(tr('wizard.renta.copied'));
    writeText.mockRejectedValueOnce(new Error('no'));
    await act(async () =>
      fireEvent.click(
        screen.getByRole('button', { name: tr('wizard.renta.copyBox', { box: '0012' }) })
      )
    );
    expect(screen.getByText(tr('wizard.renta.copyFailed'))).toBeInTheDocument();
    next();
    fireEvent.click(screen.getByRole('button', { name: tr('wizard.renta.fileGuide') }));
    expect(onHowToFile).toHaveBeenCalledWith('renta-web');
  });

  it('shows the result and what the deductions save at the end', async () => {
    saved({
      ccaaId: 'madrid',
      gross: '28000',
      withheld: '1000',
      age: '34',
      answers: { income: 'work' },
      choices: { 'estado-donativos-ley-49-2002': { on: true, amount: '120', units: '' } },
    });
    localStorage.setItem(
      wizardKey(rentaState.year),
      JSON.stringify({
        at: 8,
        screen: 0,
        done: [
          'you',
          'family',
          'work',
          'home',
          'invest',
          'activity',
          'deductions',
          'review',
          'result',
        ],
        answers: {},
        streak: 1,
        lastDay: '2026-01-01',
      })
    );
    premium();
    const line = await screen.findByText(/marcado ahorras unos/);
    expect(line.textContent?.replace(/\s/g, ' ')).toBe(
      tr('wizard.renta.finaleSaved', { amount: '120,00 €' }).replace(/\s/g, ' ')
    );
    expect(screen.getByText(tr('tools.renta.toPay'), { exact: false })).toBeInTheDocument();
  });
});

describe('step by step or everything together', () => {
  it('switches to the expert screen and back, remembering it, with nothing lost', () => {
    saved({ gross: '31000' });
    local();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('wizard.expert')) }));
    expect(localStorage.getItem(ASSISTANT_KEY)).toBe('expert');
    expect(
      screen.getByRole('heading', { name: tr('tools.renta.investCard.title') })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('wizard.backToSteps') }));
    expect(localStorage.getItem(ASSISTANT_KEY)).toBe('steps');
    expect(heading(tr('wizard.renta.q.draft'))).toBeInTheDocument();
  });

  it('starts again from step 1 and wipes the data, once confirmed', async () => {
    saved({ gross: '31000', ccaaId: 'madrid' });
    at(3);
    local();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('wizard.restart')) }));
    expect(heading(tr('wizard.renta.q.draft'))).toBeInTheDocument();
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(wizardKey(rentaState.year)) as string).done).toEqual(
        []
      )
    );
    skip(tr('wizard.renta.skip.draft'));
    expect(screen.getByLabelText(tr('tools.renta.ccaa'))).toHaveValue('');
  });
});

describe('the Renta step by step: persona p4-109 (crypto investor in Madrid)', () => {
  const dir = join(
    __dirname,
    '../../../../docs/casos-practicos/personas/p4-109-cripto-binance-ledger-staking-madrid/archivos'
  );
  const fileOf = (name: string): File => {
    const text = readFileSync(join(dir, name), 'utf8');
    const bytes = new TextEncoder().encode(text);
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return Object.assign(new File([data], name), {
      arrayBuffer: async () => data,
      text: async () => text,
    });
  };

  it('imports the files of the exchange in its own step and gives the savings base of the persona', async () => {
    const { savingsDetail: _detail, ...form } = investor.renta.declaraciones[0].form;
    saved({ ...(form as Partial<RentaForm>), answers: { income: 'work' } });
    at(4);
    premium();
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    const input = screen.getByLabelText(tr('tools.invest.file')) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: {
          files: [
            fileOf('binance-historial-transacciones.csv'),
            fileOf('ledger-live-operaciones.csv'),
          ],
        },
      });
    });
    fireEvent.click(screen.getByRole('button', { name: tr('tools.invest.apply') }));
    expect(screen.getByText(/Importado: binance-historial-transacciones.csv/)).toBeInTheDocument();
    // Importing answers the savings question: the step can be finished.
    next();
    finish(5);
    own('activity', 'no');
    finish(6);
    guided('plan', 'no');
    next();
    own('donations', 'no');
    next();
    own('others', 'no');
    finish(7);
    skip();
    expect(await screen.findByText(tr('tools.renta.toPay'), { exact: false })).toBeInTheDocument();
    next();
    // Box 0460 of the persona (calculo.md): 23,000 € of gains and 10 € of staking.
    expect(screen.getByText('0460').closest('li')).toHaveTextContent('23.010,00');
  });
});

describe('the Renta step by step: persona 02 (couple with two children, one pay, Andalucía)', () => {
  const form = couple.renta.declaraciones[0].form;

  it('asks the children and the partner, and says the joint return pays off', async () => {
    saved({ ccaaId: form.ccaaId, age: form.age, answers: { ccaa: form.ccaaId, age: form.age } });
    at(1);
    premium();
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    next(); // no disability
    guided('family', 'yes');
    fireEvent.click(screen.getByRole('button', { name: `+ ${tr('tools.renta.addChild')}` }));
    fireEvent.click(screen.getByRole('button', { name: `+ ${tr('tools.renta.addChild')}` }));
    type(tr('tools.renta.childAge', { n: 1 }), form.children[0].age);
    type(tr('tools.renta.childAge', { n: 2 }), form.children[1].age);
    // Both parents live with them: the minimum is shared.
    fireEvent.click(screen.getByLabelText(tr('tools.renta.shared')));
    next();
    guided('joint', 'couple');
    type(tr('tools.renta.joint.age'), form.partner.age);
    type(tr('tools.renta.joint.socialSecurity'), form.partner.socialSecurity);
    finish(2);
    guided('income', 'work');
    type(tr('tools.renta.gross'), form.gross);
    type(tr('tools.renta.socialSecurity'), form.socialSecurity);
    type(tr('tools.renta.withheld'), form.withheld);
    next();
    own('payers', 'no');
    finish(3);
    guided('housing', 'no');
    next();
    guided('property', 'no');
    finish(4);
    skip(tr('wizard.renta.skip.investImport'));
    guided('savings', 'no');
    finish(5);
    own('activity', 'no');
    finish(6);
    guided('plan', 'no');
    next();
    own('donations', 'no');
    next();
    own('others', 'no');
    finish(7);
    skip();
    // calculo.md of the persona: 342,42 € to pay alone, 1.173 € back together.
    expect(
      await screen.findByText(
        tr('tools.renta.joint.best.joint', { amount: '1515,42 €' }).replace(/\s/g, ' '),
        {
          normalizer: (text) => text.replace(/\s/g, ' '),
        }
      )
    ).toBeInTheDocument();
    next();
    expect(screen.getByText('0670').closest('li')).toHaveTextContent('342,42');
  });
});
