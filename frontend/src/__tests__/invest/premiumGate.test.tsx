import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { CHAPTERS } from '@modules/invest/domain/content';
import { InvestView } from '@modules/invest/ui/InvestView';
import { LearnLocked } from '@modules/invest/ui/LearnLocked';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithI18n, renderWithProviders, tr } from '@test-utils/render';

const FREE = f.billing({ plan: 'free', trialDaysLeft: 0, limits: f.catalog().limits.free });

const tab = (id: string) =>
  screen.getByRole('tab', { name: literal(tr(`app.invest.section.${id}`)) });

function renderInvest(billing: ReturnType<typeof f.billing> | Error) {
  const api = createFakeApi();
  if (billing instanceof Error) api.billingApi.get.mockRejectedValue(billing);
  else api.billingApi.get.mockResolvedValue(billing);
  return renderWithProviders(<InvestView />, { api, plan: true });
}

describe('Learn to invest: free accounts', () => {
  it('keeps the information tab free, with its disclaimer, and marks the other one Premium', async () => {
    renderInvest(FREE);
    await waitFor(() => expect(within(tab('learn')).getByText('Premium')).toBeInTheDocument());
    expect(tab('map')).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('note', { name: tr('app.invest.disclaimer.title') })
    ).toBeInTheDocument();
    expect(screen.getByText(/Las 9 grandes clases/)).toBeInTheDocument();
    expect(within(tab('map')).queryByText('Premium')).toBeNull();
  });

  it('shows the intro, a translucent preview and an upgrade panel instead of the chapters', async () => {
    const { container } = renderInvest(FREE);
    await waitFor(() => expect(within(tab('learn')).getByText('Premium')).toBeInTheDocument());
    fireEvent.click(tab('learn'));
    const panel = screen.getByRole('region', { name: tr('app.invest.locked.title') });
    expect(panel).toHaveTextContent(tr('app.invest.locked.text'));
    const preview = container.querySelector('.inv-locked-preview') as HTMLElement;
    expect(preview).toHaveAttribute('aria-hidden', 'true');
    expect(preview).toHaveAttribute('inert');
    expect(preview.querySelectorAll('.inv-chapter')).toHaveLength(CHAPTERS.length);
    expect(preview.querySelector('button, a, input')).toBeNull();
    expect(screen.queryByLabelText(tr('app.invest.learn.search'))).toBeNull();
  });

  it('never puts the text of a chapter in the page', async () => {
    const { container } = renderInvest(FREE);
    await waitFor(() => expect(within(tab('learn')).getByText('Premium')).toBeInTheDocument());
    fireEvent.click(tab('learn'));
    const text = container.textContent ?? '';
    for (const c of CHAPTERS) {
      expect(text).not.toContain(c.summary);
      const firstText = c.blocks.find((b) => b.k === 'p' || b.k === 'warn');
      if (firstText && 't' in firstText) expect(text).not.toContain(firstText.t.slice(0, 60));
    }
    expect(text).not.toContain('Mercados bursátiles: horarios, apertura y cierre');
  });

  it('opens the upgrade dialog from the panel', async () => {
    renderInvest(FREE);
    await waitFor(() => expect(within(tab('learn')).getByText('Premium')).toBeInTheDocument());
    fireEvent.click(tab('learn'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.invest.locked.cta') }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('lands on the locked panel from a link in the map, not on the chapter', async () => {
    const { container } = renderInvest(FREE);
    await waitFor(() => expect(within(tab('learn')).getByText('Premium')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Renta variable/ }));
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.invest.map.goChapter')) })
    );
    expect(tab('learn')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('region', { name: tr('app.invest.locked.title') })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Acciones: qué son/ })).toBeNull();
    expect(container.textContent).not.toContain('Una acción es una parte del capital');
  });
});

describe('Learn to invest: Premium accounts', () => {
  const lifetime = f.billing({
    subscription: {
      ...f.billing().subscription,
      lifetime: true,
      source: 'lifetime',
      status: 'active',
    },
  });

  it.each([
    ['in the free trial', f.billing()],
    ['with a lifetime plan', lifetime],
  ])('shows the chapters %s', async (_name, billing) => {
    renderInvest(billing);
    fireEvent.click(tab('learn'));
    await waitFor(() =>
      expect(screen.getByLabelText(tr('app.invest.learn.search'))).toBeInTheDocument()
    );
    expect(within(tab('learn')).queryByText('Premium')).toBeNull();
    expect(screen.queryByRole('region', { name: tr('app.invest.locked.title') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: literal(CHAPTERS[0].title) }));
    expect(
      screen.getByRole('heading', { level: 2, name: /Acciones: qué son/ })
    ).toBeInTheDocument();
  });

  it('lets the map link open the chapter', async () => {
    renderInvest(f.billing());
    fireEvent.click(screen.getByRole('button', { name: /Renta variable/ }));
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.invest.map.goChapter')) })
    );
    expect(
      await screen.findByRole('heading', { level: 2, name: /Acciones: qué son/ })
    ).toBeInTheDocument();
  });

  it('waits for the plan before deciding', async () => {
    renderInvest(f.billing());
    fireEvent.click(tab('learn'));
    expect(screen.getByRole('status')).toHaveTextContent(tr('app.common.loading'));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('does not lock anything when the plan cannot be read', async () => {
    renderInvest(new Error('offline'));
    fireEvent.click(tab('learn'));
    await waitFor(() =>
      expect(screen.getByLabelText(tr('app.invest.learn.search'))).toBeInTheDocument()
    );
  });
});

describe('Locked preview in English', () => {
  it('is in English and still has no real text', () => {
    const upgrade = jest.fn();
    const { container } = renderWithI18n(<LearnLocked onUpgrade={upgrade} />, 'en');
    expect(screen.getByText('Go Premium to see the content of the chapters')).toBeInTheDocument();
    expect(screen.getByText(CHAPTERS[0].titleEn)).toBeInTheDocument();
    expect(container.textContent).not.toContain(CHAPTERS[0].summaryEn);
    fireEvent.click(screen.getByRole('button', { name: 'See the Premium plans' }));
    expect(upgrade).toHaveBeenCalled();
  });
});
