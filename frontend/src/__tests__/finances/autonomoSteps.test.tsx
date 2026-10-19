import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { emptyManual } from '@modules/finances/ui/components/AutonomoManual';
import { toInvoices } from '@modules/finances/domain/invoiceLedger';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

const entry = (date: string, concept: string, base: number) => ({
  date,
  quarter: (Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1) as 1 | 2 | 3 | 4,
  base,
  vatRate: 21 as const,
  vat: Math.round(base * 21) / 100,
  total: Math.round(base * 121) / 100,
  withheld: 0,
  concept,
});

const stored = (over: object) =>
  localStorage.setItem('mm_autonomo_manual2', JSON.stringify({ ...emptyManual(), ...over }));

const open = async () => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
  const view = renderWithProviders(<BusinessView />, { api, plan: true });
  await screen.findByLabelText(tr('app.autonomo.workArea'));
  return view;
};

const bar = () => screen.getByRole('navigation', { name: tr('app.autonomo.steps.label') });
const stepButton = (step: 'bring' | 'review' | 'result') =>
  within(bar()).getByRole('button', { name: new RegExp(tr(`app.autonomo.steps.${step}`)) });
const section = (step: 'bring' | 'review' | 'result') =>
  screen.getByRole('region', { name: new RegExp(tr(`app.autonomo.steps.${step}`)) });
const summary = () => screen.getByRole('complementary', { name: tr('app.autonomo.summary.label') });

beforeEach(() => {
  localStorage.clear();
  // Everything together (the assistant has its own suite).
  localStorage.setItem('mm_autonomo_assistant', 'expert');
  // The fourth quarter of 2026 has begun: the draft opens on it.
  freezeTime('2027-01-18T12:00:00');
});
afterEach(() => {
  restoreTime();
  jest.restoreAllMocks();
});

describe('The steps of the self-employed screen', () => {
  it('puts every panel in its step, in order', async () => {
    await open();
    const list = within(bar()).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(stepButton('bring')).toHaveAttribute('aria-current', 'step');
    expect(stepButton('review')).not.toHaveAttribute('aria-current');

    const bring = section('bring');
    expect(
      within(bring).getByRole('region', { name: tr('app.autonomo.import.title') })
    ).toBeInTheDocument();
    expect(within(bring).getByLabelText(tr('app.autonomo.workArea'))).toBeInTheDocument();
    // The filed modelo 130: only once there are earlier quarters.
    expect(within(bring).getByLabelText(tr('app.autonomo.priorOn'))).toBeInTheDocument();

    const review = section('review');
    expect(
      within(review).getByRole('heading', { name: tr('app.autonomo.quarterN', { n: 4 }) })
    ).toBeInTheDocument();
    expect(within(review).getByLabelText(tr('app.autonomo.hardToJustify'))).toBeInTheDocument();

    const result = section('result');
    expect(within(result).getByLabelText(tr('app.autonomo.year'))).toBeInTheDocument();
    expect(
      within(result).getByRole('button', { name: tr('app.autonomo.prepare') })
    ).toBeInTheDocument();

    // Document order: bring, review, result.
    expect(bring.compareDocumentPosition(review) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(review.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('goes to a step smoothly, with the focus on its title', async () => {
    await open();
    const scroll = jest.spyOn(Element.prototype, 'scrollIntoView');
    fireEvent.click(stepButton('result'));
    expect(stepButton('result')).toHaveAttribute('aria-current', 'step');
    expect(stepButton('bring')).not.toHaveAttribute('aria-current');
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(
      within(section('result')).getByRole('heading', {
        name: new RegExp(tr('app.autonomo.steps.result')),
      })
    ).toHaveFocus();
  });

  it('jumps without animation when the device asks for less motion', async () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as never;
    await open();
    const scroll = jest.spyOn(Element.prototype, 'scrollIntoView');
    fireEvent.click(stepButton('review'));
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('moves between the steps with the keyboard', async () => {
    await open();
    stepButton('bring').focus();
    fireEvent.keyDown(stepButton('bring'), { key: 'ArrowRight' });
    expect(stepButton('review')).toHaveFocus();
    fireEvent.keyDown(stepButton('review'), { key: 'ArrowDown' });
    expect(stepButton('result')).toHaveFocus();
    // The last one stays the last one.
    fireEvent.keyDown(stepButton('result'), { key: 'ArrowRight' });
    expect(stepButton('result')).toHaveFocus();
    fireEvent.keyDown(stepButton('result'), { key: 'ArrowLeft' });
    expect(stepButton('review')).toHaveFocus();
    fireEvent.keyDown(stepButton('review'), { key: 'ArrowUp' });
    expect(stepButton('bring')).toHaveFocus();
    fireEvent.keyDown(stepButton('bring'), { key: 'ArrowLeft' });
    expect(stepButton('bring')).toHaveFocus();
    fireEvent.keyDown(stepButton('bring'), { key: 'End' });
    expect(stepButton('result')).toHaveFocus();
    fireEvent.keyDown(stepButton('result'), { key: 'Home' });
    expect(stepButton('bring')).toHaveFocus();
    // Other keys do nothing; the focus does not move.
    fireEvent.keyDown(stepButton('bring'), { key: 'a' });
    expect(stepButton('bring')).toHaveFocus();
  });

  it('follows the step on screen while scrolling', async () => {
    let notify: (entries: Partial<IntersectionObserverEntry>[]) => void = () => undefined;
    const observed: Element[] = [];
    const disconnect = jest.fn();
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = jest.fn(
      (callback: (entries: Partial<IntersectionObserverEntry>[]) => void) => {
        notify = callback;
        return { observe: (el: Element) => observed.push(el), disconnect };
      }
    );
    const { unmount } = await open();
    expect(observed.map((el) => el.id)).toEqual([
      'autonomo-step-bring',
      'autonomo-step-review',
      'autonomo-step-result',
    ]);
    act(() => notify([{ isIntersecting: true, target: observed[1] }]));
    expect(stepButton('review')).toHaveAttribute('aria-current', 'step');
    // A step leaving the band does not change it.
    act(() => notify([{ isIntersecting: false, target: observed[2] }]));
    expect(stepButton('review')).toHaveAttribute('aria-current', 'step');
    unmount();
    expect(disconnect).toHaveBeenCalled();
    delete (window as { IntersectionObserver?: unknown }).IntersectionObserver;
  });

  it('marks the steps already done', async () => {
    await open();
    expect(
      within(stepButton('bring')).queryByText(`(${tr('app.autonomo.steps.done')})`)
    ).toBeNull();
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.workArea')), {
      target: { value: '12' },
    });
    expect(stepButton('bring')).toHaveTextContent('✓');
    expect(stepButton('bring')).toHaveTextContent(tr('app.autonomo.steps.done'));
    expect(stepButton('result')).not.toHaveTextContent('✓');
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.prepare') }));
    await waitFor(() => expect(stepButton('result')).toHaveTextContent('✓'));
  });

  it('keeps the summary under the header of the app', async () => {
    const header = document.createElement('div');
    header.className = 'dashboard-sticky';
    jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect);
    document.body.appendChild(header);
    const { container } = await open();
    const card = container.querySelector('.autonomo-card') as HTMLElement;
    expect(card.style.getPropertyValue('--autonomo-top')).toBe('64px');
    header.remove();
  });
});

describe('The summary', () => {
  it('starts empty, inviting to begin with step 1', async () => {
    await open();
    const box = summary();
    expect(box).toHaveTextContent(tr('app.autonomo.summary.period', { year: 2026, n: 4 }));
    expect(box).toHaveTextContent(tr('app.autonomo.summary.invoices', { n: 0 }));
    expect(box).toHaveTextContent(tr('app.autonomo.summary.start'));
  });

  it('adds up the year to the quarter of the draft, and says there is nothing pending', async () => {
    await open();
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.income.r21')} 1`), {
      target: { value: '1000' },
    });
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.income.r10')} 4`), {
      target: { value: '500,5' },
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: `+ ${tr('app.autonomo.addExpense')}` })[0]
    );
    fireEvent.change(screen.getByLabelText(`${tr('app.autonomo.expenseAmount')} 1.1`), {
      target: { value: '121' },
    });
    const box = summary();
    expect(box).toHaveTextContent(/1500,50\s€/);
    expect(box).toHaveTextContent(/121,00\s€/);
    expect(box).toHaveTextContent(tr('app.autonomo.summary.ready'));
  });

  it('takes the totals of the filed modelo 130 for the earlier quarters', async () => {
    stored({
      prior: { on: true, income: '9000', expenses: '2000', payments: '', withheld: '' },
      quarters: [0, 1, 2, 3].map((i) => ({
        income: { r21: i === 3 ? '1000' : '7777', r10: '', r4: '', r0: '' },
        withheld: '',
        expenses: [],
      })),
    });
    await open();
    expect(summary()).toHaveTextContent(/10\.000,00\s€/);
    expect(summary()).toHaveTextContent(/2000,00\s€/);
    // Only the fourth quarter is on screen: the 130 stands for the others.
    expect(summary()).not.toHaveTextContent(/7777/);
  });

  it('says which quarters miss their invoices, and takes there', async () => {
    stored({
      invoices: [
        ...toInvoices('received', [entry('2026-02-01', 'Alquiler', 100)], {}, []),
        ...toInvoices('issued', [entry('2026-05-01', 'Cliente', 300)], {}, []),
      ],
    });
    await open();
    const box = summary();
    expect(box).toHaveTextContent(tr('app.autonomo.summary.invoices', { n: 2 }));
    expect(box).toHaveTextContent(tr('app.autonomo.summary.missing.income', { n: 1 }));
    expect(box).toHaveTextContent(tr('app.autonomo.summary.missing.expenses', { n: 2 }));
    const both = within(box).getByRole('button', {
      name: tr('app.autonomo.summary.missing.both', { n: 3 }),
    });
    expect(box).not.toHaveTextContent(tr('app.autonomo.summary.ready'));
    fireEvent.click(both);
    expect(
      screen.getByRole('heading', { name: tr('app.autonomo.quarterN', { n: 3 }) })
    ).toHaveFocus();
  });

  it('counts the warnings and takes to them', async () => {
    stored({
      invoices: toInvoices(
        'received',
        [
          entry('2026-10-01', 'Alquiler oficina', 400),
          entry('2026-10-01', 'Alquiler oficina', 400),
        ],
        {},
        []
      ),
    });
    await open();
    const warnings = within(summary()).getByRole('button', {
      name: tr('app.autonomo.summary.warnings', { n: 1 }),
    });
    fireEvent.click(warnings);
    expect(screen.getByRole('heading', { name: tr('app.autonomo.checks.title') })).toHaveFocus();
  });

  it('takes to the period of the draft, and follows it when it changes', async () => {
    await open();
    fireEvent.click(
      within(summary()).getByRole('button', {
        name: tr('app.autonomo.summary.period', { year: 2026, n: 4 }),
      })
    );
    expect(screen.getByLabelText(tr('app.autonomo.year'))).toHaveFocus();
    expect(stepButton('result')).toHaveAttribute('aria-current', 'step');
    fireEvent.change(screen.getByLabelText(tr('app.autonomo.quarter')), { target: { value: '2' } });
    expect(summary()).toHaveTextContent(tr('app.autonomo.summary.period', { year: 2026, n: 2 }));
    expect(summary()).toHaveTextContent(
      tr('app.autonomo.summary.periodShort', { year: 2026, n: 2 })
    );
  });
});
