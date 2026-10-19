import { fireEvent, screen, within } from '@testing-library/react';
import { PROGRESS_KEY, PROGRESS_VERSION } from '@modules/tools/application/rentaProgress';
import { rentaState } from '@modules/tools/data/renta/state';
import { readDraft } from '@modules/tools/domain/rentaDraft';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import { renderWithProviders, tr } from '@test-utils/render';

beforeEach(() => localStorage.clear());

/** Every guided question answered: a worker of 40 in Madrid with no family and no home costs. */
const ANSWERS = {
  ccaa: 'madrid',
  age: '40',
  income: 'work',
  disability: '0',
  family: 'no',
  joint: 'none',
  property: 'no',
  savings: 'no',
  plan: 'no',
  housing: 'no',
};

const saved = (form: Partial<RentaForm>, extra: Record<string, unknown> = {}) =>
  localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({
      version: PROGRESS_VERSION,
      year: rentaState.year,
      form: { ...emptyForm('30000'), ccaaId: 'madrid', answers: ANSWERS, ...form },
      draft: null,
      ...extra,
    })
  );
const stored = () => JSON.parse(localStorage.getItem(PROGRESS_KEY) as string);

const render = (locale: 'es' | 'en' = 'es') =>
  renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false, locale });
const loaded = () => screen.findByText(/Deducciones de Comunidad de Madrid/);
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const START = tr('tools.renta.review.start');
const progress = () => document.getElementById('renta-review-progress') as HTMLElement;
/** The deduction on screen: its title. */
const title = () =>
  (document.querySelector('.renta-review-item h3') as HTMLElement).textContent as string;
const answer = (key: 'yes' | 'no' | 'later') =>
  fireEvent.click(
    button(
      `${tr(key === 'later' ? 'tools.renta.review.later' : `tools.renta.draft.${key}`)}: ${title()}`
    )
  );

/** Goes through the whole review answering the same to each one; the titles in order. */
function walkAll(key: 'no' | 'later'): string[] {
  const titles: string[] = [];
  while (document.querySelector('.renta-review-item')) {
    titles.push(title());
    answer(key);
  }
  return titles;
}

describe('the review of the deductions that could apply, without a draft', () => {
  it('goes on from the guided summary, one at a time, with a progress that is announced', async () => {
    saved({});
    render();
    await loaded();
    // The summary of the answers, then the review: the button of the summary starts it.
    const summary = screen.getByText(tr('tools.renta.guide.summary')).closest('div') as HTMLElement;
    fireEvent.click(within(summary).getByRole('button', { name: START }));
    expect(progress()).toHaveAttribute('aria-live', 'polite');
    expect(progress().textContent).toMatch(/^Deducción 1 de \d+$/);
    expect(document.querySelector('.renta-review-item h3')).toHaveFocus();
    // The State's first.
    expect(screen.getByText(tr('tools.renta.stateDeductions'), { selector: 'p' })).toBeTruthy();
    expect(
      within(document.querySelector('.renta-review-item') as HTMLElement).getByRole('link', {
        name: tr('tools.renta.official'),
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr('tools.renta.guide.back') })).toBeNull();
  });

  it('suggests none about children without children, and keeps the dismissed ones', async () => {
    saved({});
    render();
    await loaded();
    fireEvent.click(screen.getAllByRole('button', { name: START })[0]);
    const titles = walkAll('no');
    expect(titles.length).toBeGreaterThan(3);
    expect(titles.filter((t) => /hij|numerosa|guarder|maternidad|nacimiento/i.test(t))).toEqual([]);
    // A community's after the State's.
    expect(titles.some((t) => /hipoteca|deporte|veterinari|vivienda/i.test(t))).toBe(true);
    expect(screen.getByText(tr('tools.renta.review.doneTitle'))).toHaveFocus();
    expect(
      screen.getByText(tr('tools.renta.review.dismissed', { count: titles.length }))
    ).toBeInTheDocument();
    expect(stored().review.dismissed).toHaveLength(titles.length);
    // Dismissed ones do not come back, but can all be reviewed again.
    expect(screen.queryByRole('button', { name: /Revisar las que quedan/ })).toBeNull();
    fireEvent.click(button(tr('tools.renta.review.again')));
    expect(screen.getByText(tr('tools.renta.review.status.dismissed'))).toBeInTheDocument();
  });

  it('marks one, asks for the amount of a percentage, leaves one for later and goes back', async () => {
    saved({
      children: [
        { age: '2', disability: 0 },
        { age: '6', disability: 0 },
      ],
      answers: { ...ANSWERS, family: 'yes' },
    });
    render();
    await loaded();
    fireEvent.click(screen.getAllByRole('button', { name: START })[0]);
    const titles: string[] = [];
    let marked = '';
    let percent = '';
    // Through the whole review: the first fixed one is marked, the first that needs an amount too.
    while (document.querySelector('.renta-review-item')) {
      titles.push(title());
      const field = document.querySelector<HTMLInputElement>('.renta-review-item input');
      if (field && !percent) {
        percent = title();
        answer('yes');
        expect(screen.getByRole('alert')).toHaveTextContent(tr('tools.renta.review.amountError'));
        expect(field).toHaveFocus();
        expect(field).toHaveAttribute('aria-invalid', 'true');
        fireEvent.change(field, { target: { value: '500' } });
        expect(screen.queryByRole('alert')).toBeNull();
        fireEvent.submit(field.closest('form') as HTMLElement);
      } else if (!field && !marked) {
        marked = title();
        answer('yes');
      } else {
        answer('later');
      }
    }
    expect(titles.some((t) => /maternidad/i.test(t))).toBe(true);
    expect(titles.some((t) => /numerosa/i.test(t))).toBe(true);
    expect(screen.getByText(tr('tools.renta.review.marked', { count: 2 }))).toBeInTheDocument();
    expect(
      screen.getByText(tr('tools.renta.review.pending', { count: titles.length - 2 }))
    ).toBeInTheDocument();
    expect(stored().form.choices[Object.keys(stored().form.choices)[0]].on).toBe(true);
    expect(Object.values(stored().form.choices)).toContainEqual(
      expect.objectContaining({ on: true, amount: '500' })
    );
    expect(stored().review.later).toHaveLength(titles.length - 2);
    // What is left: the ones for later, again. Back goes to the one before, with its answer.
    fireEvent.click(button(/Revisar las que quedan/));
    expect(progress().textContent).toBe(
      tr('tools.renta.review.progress', { n: 1, total: titles.length - 2 })
    );
    expect(screen.getByText(tr('tools.renta.review.status.later'))).toBeInTheDocument();
    answer('no');
    fireEvent.click(button(tr('tools.renta.guide.back')));
    expect(screen.getByText(tr('tools.renta.review.status.dismissed'))).toBeInTheDocument();
    walkAll('later');
    // All of them again: the marked ones are not asked again.
    fireEvent.click(button(tr('tools.renta.review.again')));
    const again = walkAll('later');
    expect(again).not.toContain(marked);
    expect(again).not.toContain(percent);
  });

  it('unmarks one that does not apply after all, going back to it', async () => {
    saved({});
    render();
    await loaded();
    fireEvent.click(screen.getAllByRole('button', { name: START })[0]);
    const field = document.querySelector<HTMLInputElement>('.renta-review-item input');
    if (field) fireEvent.change(field, { target: { value: '100' } });
    const first = title();
    answer('yes');
    fireEvent.click(button(tr('tools.renta.guide.back')));
    expect(title()).toBe(first);
    expect(screen.getByText(tr('tools.renta.review.status.marked'))).toBeInTheDocument();
    answer('no');
    expect(Object.values(stored().form.choices).some((c) => (c as { on: boolean }).on)).toBe(false);
  });

  it('goes to the result at the end', async () => {
    saved({});
    render();
    await loaded();
    const scroll = jest.spyOn(Element.prototype, 'scrollIntoView');
    fireEvent.click(screen.getAllByRole('button', { name: START })[0]);
    walkAll('later');
    fireEvent.click(button(tr('tools.renta.review.toResult')));
    expect(scroll).toHaveBeenCalled();
    scroll.mockRestore();
  });

  it('is in expert mode too, with the badge in the full list', async () => {
    localStorage.setItem('mm_renta_view', 'expert');
    saved({});
    render();
    await loaded();
    expect(screen.getAllByText(tr('tools.renta.hint.missing')).length).toBeGreaterThan(0);
    fireEvent.click(button(START));
    expect(progress()).toBeInTheDocument();
  });

  it('shows apart the ones the income does not allow, with the reason', async () => {
    saved({
      gross: '120000',
      ccaaId: 'comunitat-valenciana',
      answers: { ...ANSWERS, ccaa: 'comunitat-valenciana' },
    });
    render();
    await screen.findByText(/Deducciones de Comunitat Valenciana/);
    const out = screen.getByText(/No puedes aplicarlas por tu nivel de renta/);
    const list = out.closest('details') as HTMLElement;
    expect(within(list).getByText('Dentista y salud bucodental')).toBeInTheDocument();
    expect(within(list).getAllByText(/27\.000|30\.000/).length).toBeGreaterThan(0);
  });

  it('asks to choose the community while there is none, and starts again with a new one', async () => {
    saved({ ccaaId: '', answers: { ...ANSWERS, ccaa: '' } });
    localStorage.setItem('mm_renta_view', 'expert');
    render();
    expect(screen.getByText(tr('tools.renta.review.noCcaa'))).toBeInTheDocument();
    fireEvent.click(button(START));
    expect(title()).toBeTruthy();
    fireEvent.change(screen.getByLabelText(tr('tools.renta.ccaa')), {
      target: { value: 'madrid' },
    });
    await loaded();
    expect(document.querySelector('.renta-review-item')).toBeNull();
  });

  it('does not ask again what was dismissed with the draft', async () => {
    const reading = readDraft('Retribuciones dinerarias 30.000,00 0003', {
      year: 2025,
      communities: [],
    });
    saved(
      {},
      {
        draft: {
          reading,
          rents: false,
          dismissed: ['estado-eficiencia-calefaccion-refrigeracion'],
          scenario: null,
        },
      }
    );
    render();
    await loaded();
    fireEvent.click(screen.getAllByRole('button', { name: START })[0]);
    const titles = walkAll('no');
    expect(titles).not.toContain('Obras que reducen la calefacción y la refrigeración');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('speaks English', async () => {
    saved({});
    render('en');
    await screen.findByText(/Deductions of Comunidad de Madrid/);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Review the deductions that may apply to me' })[0]
    );
    expect(progress().textContent).toMatch(/^Deduction 1 of \d+$/);
    expect(button(/^I will decide later: /)).toBeInTheDocument();
  });
});
