import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@core/api/http';
import { ApiProvider } from '@core/context/ApiContext';
import { CHAPTERS, FREE_CHAPTERS } from '@modules/invest/domain/content';
import { InvestView } from '@modules/invest/ui/InvestView';
import { LearnLocked } from '@modules/invest/ui/LearnLocked';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithI18n, renderWithProviders, tr } from '@test-utils/render';

const FREE = f.billing({ plan: 'free', trialDaysLeft: 0, limits: f.catalog().limits.free });
const PREMIUM_CHAPTER = CHAPTERS.find((c) => c.premium)!;

const tab = (id: string) =>
  screen.getByRole('tab', { name: literal(tr(`app.invest.section.${id}`)) });
const openChapter = (title: string) =>
  fireEvent.click(screen.getByRole('button', { name: literal(title) }));

function renderInvest(billing: ReturnType<typeof f.billing> | Error) {
  const api = createFakeApi();
  if (billing instanceof Error) api.billingApi.get.mockRejectedValue(billing);
  else api.billingApi.get.mockResolvedValue(billing);
  return { ...renderWithProviders(<InvestView />, { api, plan: true }), api };
}

/** The catalogue is shown once the plan is known. */
const openLearn = async () => {
  fireEvent.click(tab('learn'));
  await screen.findByLabelText(tr('app.invest.learn.search'));
};

describe('Learn to invest: the catalogue', () => {
  it('has the first two chapters free and the rest Premium, without their text in the app', () => {
    expect(CHAPTERS.slice(0, 2).map((c) => c.premium)).toEqual([false, false]);
    expect(CHAPTERS.slice(2).every((c) => c.premium)).toBe(true);
    expect(FREE_CHAPTERS.map((c) => c.id)).toEqual(CHAPTERS.slice(0, 2).map((c) => c.id));
    for (const c of CHAPTERS.slice(2)) expect(c).not.toHaveProperty('blocks');
  });
});

describe('Learn to invest: free accounts', () => {
  it('keeps both tabs open, with the disclaimer', async () => {
    renderInvest(FREE);
    await openLearn();
    expect(within(tab('learn')).queryByText('Premium')).toBeNull();
    fireEvent.click(tab('map'));
    expect(
      screen.getByRole('note', { name: tr('app.invest.disclaimer.title') })
    ).toBeInTheDocument();
    expect(screen.getByText(/Las 9 grandes clases/)).toBeInTheDocument();
  });

  it('marks the Premium chapters and reads the free ones', async () => {
    const { container } = renderInvest(FREE);
    await openLearn();
    const chips = container.querySelectorAll('.inv-chapter .premium-chip');
    expect(chips).toHaveLength(CHAPTERS.length - 2);
    openChapter(CHAPTERS[1].title);
    expect(container.querySelector('.inv-callout--key')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: tr('app.invest.locked.title') })).toBeNull();
  });

  it('shows the upgrade panel instead of a Premium chapter and never asks for its text', async () => {
    const { api } = renderInvest(FREE);
    await openLearn();
    openChapter(PREMIUM_CHAPTER.title);
    const panel = screen.getByRole('region', { name: tr('app.invest.locked.title') });
    expect(panel).toHaveTextContent(tr('app.invest.locked.text'));
    expect(api.learnApi.chapter).not.toHaveBeenCalled();
    expect(api.learnApi.glossary).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: tr('app.invest.locked.cta') }));
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      tr('billing.reason.feature', { feature: tr('billing.feature.investCourse') })
    );
  });

  it('opens the free Shares chapter from the map', async () => {
    renderInvest(FREE);
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /Renta variable/ }));
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(tr('app.invest.map.goChapter')) })
    );
    expect(
      await screen.findByRole('heading', { level: 2, name: /Acciones: qué son/ })
    ).toBeInTheDocument();
  });

  it('keeps the Premium chapters locked when the plan cannot be read', async () => {
    const { api } = renderInvest(new Error('offline'));
    await openLearn();
    openChapter(PREMIUM_CHAPTER.title);
    expect(screen.getByRole('region', { name: tr('app.invest.locked.title') })).toBeInTheDocument();
    expect(api.learnApi.chapter).not.toHaveBeenCalled();
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
  ])('reads a Premium chapter from the API %s', async (_name, billing) => {
    const { api, container } = renderInvest(billing);
    await openLearn();
    expect(container.querySelectorAll('.inv-chapter .premium-chip')).toHaveLength(0);
    openChapter(PREMIUM_CHAPTER.title);
    expect(screen.getByRole('status')).toHaveTextContent(tr('app.common.loading'));
    expect(
      await screen.findByText('Copia un índice entero con comisiones bajas.')
    ).toBeInTheDocument();
    expect(api.learnApi.chapter).toHaveBeenCalledWith(PREMIUM_CHAPTER.id);
    expect(screen.queryByRole('region', { name: tr('app.invest.locked.title') })).toBeNull();
  });

  it('says so when a chapter cannot be loaded', async () => {
    const { api } = renderInvest(f.billing());
    api.learnApi.chapter.mockRejectedValue(new ApiError('boom', 500));
    await openLearn();
    openChapter(PREMIUM_CHAPTER.title);
    expect(await screen.findByText(tr('app.invest.learn.loadError'))).toBeInTheDocument();
  });

  it('adds the glossary of the Premium chapters', async () => {
    const { api } = renderInvest(f.billing());
    await openLearn();
    expect(await screen.findByText('Tracking difference')).toBeInTheDocument();
    expect(api.learnApi.glossary).toHaveBeenCalled();
  });

  it('waits for the plan before deciding', async () => {
    renderInvest(f.billing());
    fireEvent.click(tab('learn'));
    expect(screen.getByRole('status')).toHaveTextContent(tr('app.common.loading'));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });
});

describe('Outside the plan provider', () => {
  it('reads every chapter, the Premium ones from the API', async () => {
    const api = createFakeApi();
    renderWithI18n(
      <ApiProvider value={api}>
        <InvestView />
      </ApiProvider>
    );
    fireEvent.click(tab('learn'));
    openChapter(PREMIUM_CHAPTER.title);
    expect(
      await screen.findByText('Copia un índice entero con comisiones bajas.')
    ).toBeInTheDocument();
  });
});

describe('Locked panel in English', () => {
  it('is in English', () => {
    const upgrade = jest.fn();
    renderWithI18n(<LearnLocked onUpgrade={upgrade} />, 'en');
    expect(screen.getByText('This chapter is part of Premium')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See the Premium plans' }));
    expect(upgrade).toHaveBeenCalled();
  });
});
