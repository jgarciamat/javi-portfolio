import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { authApi } from '@core/api/authApi';
import { useAuth } from '@shared/hooks/useAuth';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { GuidedTour } from '@modules/finances/ui/tour/GuidedTour';
import {
  sectionGuideSteps,
  shortTourSteps,
  TOUR_VERSION,
  tourSteps,
  type TourStep,
} from '@modules/finances/ui/tour/tourSteps';
import { TOUR_SEEN_KEY } from '@modules/finances/application/hooks/useWelcomeTour';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { fakeAccessToken, renderWithI18n, renderWithProviders, tr } from '@test-utils/render';

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
  delete (window as { ResizeObserver?: unknown }).ResizeObserver;
  jest.useRealTimers();
  document.body.innerHTML = '';
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
});

/** A page element at a fixed place on the screen. */
function placeTarget(id: string, top: number, height: number, left = 40, width = 300) {
  const element = document.createElement('div');
  element.id = id;
  document.body.appendChild(element);
  const rect = { top, height, left, width, bottom: top + height, right: left + width };
  jest
    .spyOn(element, 'getBoundingClientRect')
    .mockImplementation(() => ({ ...rect, x: left, y: top, toJSON: () => rect }) as DOMRect);
  return { element, rect };
}

const card = () => screen.getByRole('dialog');
const next = () => fireEvent.click(screen.getByRole('button', { name: tr('app.tour.next') }));

describe('GuidedTour', () => {
  const steps: TourStep[] = [
    { id: 'welcome', tab: 'monthly' },
    { id: 'monthNav', tab: 'monthly', target: '#near-top' },
    { id: 'summary', target: '#near-bottom' },
    { id: 'movements', target: '#tall' },
    { id: 'done' },
  ];

  function renderTour(initialDontShowAgain = false) {
    const onShowTab = jest.fn();
    const onClose = jest.fn();
    const view = renderWithI18n(
      <GuidedTour
        steps={steps}
        onShowTab={onShowTab}
        onClose={onClose}
        initialDontShowAgain={initialDontShowAgain}
      />
    );
    return { onShowTab, onClose, unmount: view.unmount };
  }

  it('walks through the steps, placing the card next to what it explains', () => {
    placeTarget('near-top', 100, 50);
    placeTarget('near-bottom', 600, 100);
    const tall = placeTarget('tall', 50, 2000).element;
    const scroll = jest.spyOn(tall, 'scrollIntoView');
    const { onShowTab, onClose } = renderTour();

    // Without a target: centred over the dimmed page.
    expect(card()).toHaveClass('tour-card--center');
    expect(screen.getByText(tr('app.tour.progress', { current: 1, total: 5 }))).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: tr('app.tour.welcome.title') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: tr('app.tour.prev') })).toBeDisabled();
    expect(onShowTab).toHaveBeenCalledWith('monthly');

    next(); // fits below the element
    expect(card()).toHaveStyle({ top: '172px', left: '40px' });
    expect(document.querySelector('.tour-spotlight')).toHaveStyle({ top: '92px', height: '66px' });

    fireEvent.keyDown(card(), { key: 'ArrowRight' }); // fits above it
    expect(screen.getByRole('heading', { name: tr('app.tour.summary.title') })).toBeInTheDocument();
    expect(card()).toHaveStyle({ top: '238px' });

    next(); // taller than the screen: clipped spotlight, card at the bottom
    expect(card()).toHaveClass('tour-card--bottom');
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    fireEvent.keyDown(card(), { key: 'ArrowLeft' });
    expect(screen.getByRole('heading', { name: tr('app.tour.summary.title') })).toBeInTheDocument();
    fireEvent.keyDown(card(), { key: 'Enter' });
    next();
    next();

    // Last step: no skip link, "Finish" closes it.
    expect(screen.queryByRole('button', { name: tr('app.tour.skip') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.tour.finish') }));
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('keeps the card whole on the screen for elements at its right edge, scroll bar aside', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    placeTarget('near-top', 100, 50, 1000, 230); // a button at the right of the screen
    placeTarget('near-bottom', 100, 50, 0, 100); // and one at the left
    renderTour();

    next(); // before it is shown, the card is guessed as wide as the stylesheet makes it
    expect(card()).toHaveStyle({ left: '884px' }); // 1280 - 380 - 16

    // Its real width, and the page without its vertical scroll bar.
    jest.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1265);
    const real = Element.prototype.getBoundingClientRect;
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      return this.getAttribute('role') === 'dialog'
        ? ({ height: 200, width: 390, top: 0, left: 0, bottom: 200, right: 390 } as DOMRect)
        : real.call(this);
    });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(card()).toHaveStyle({ left: '859px' }); // 1265 - 390 - 16

    next(); // never off the left edge either
    expect(card()).toHaveStyle({ left: '16px' });
  });

  it('remembers "don\'t show again" when skipped or closed with Escape', () => {
    const { onClose } = renderTour(true);
    const checkbox = screen.getByRole('checkbox', { name: tr('app.tour.dontShowAgain') });
    expect(checkbox).toBeChecked();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenLastCalledWith(true);
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: tr('app.tour.skip') }));
    expect(onClose).toHaveBeenLastCalledWith(false);
  });

  it('waits for sections that are still loading and gives up after a while', () => {
    jest.useFakeTimers();
    renderTour();
    next();
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(document.querySelector('.tour-spotlight')).toBeNull();
    placeTarget('near-top', 100, 50);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(document.querySelector('.tour-spotlight')).not.toBeNull();

    next(); // never shows up
    act(() => {
      jest.advanceTimersByTime(3500);
    });
    expect(document.querySelector('.tour-spotlight')).toBeNull();
    expect(card()).toHaveClass('tour-card--center');
  });

  it('follows the element when the page scrolls or resizes, with a bottom card on phones', () => {
    const { rect } = placeTarget('near-top', 100, 50);
    Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
    renderTour();
    next();
    expect(card()).toHaveClass('tour-card--bottom');
    rect.top = 300;
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(document.querySelector('.tour-spotlight')).toHaveStyle({ top: '292px' });
    rect.top = 10;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(document.querySelector('.tour-spotlight')).toHaveStyle({ top: '2px' });
  });

  it('highlights a smaller part of the element on phones, when the step names one', () => {
    placeTarget('whole', 100, 900);
    placeTarget('part', 100, 80);
    const steps: TourStep[] = [{ id: 'cryptoChart', target: '#whole', phoneTarget: '#part' }];
    const show = () =>
      renderWithI18n(
        <GuidedTour
          steps={steps}
          onShowTab={jest.fn()}
          onClose={jest.fn()}
          initialDontShowAgain={false}
        />
      );
    const desktop = show();
    expect(document.querySelector('.tour-spotlight')).toHaveStyle({ height: '684px' }); // clipped to the screen
    desktop.unmount();
    Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
    show();
    expect(document.querySelector('.tour-spotlight')).toHaveStyle({ height: '96px' });
  });

  it('highlights the copy of the target that is on screen (side bar or header button)', () => {
    const hidden = placeTarget('hidden', 0, 0, 0, 0).element;
    hidden.className = 'menu';
    const shown = placeTarget('shown', 200, 40).element;
    shown.className = 'menu';
    renderWithI18n(
      <GuidedTour
        steps={[{ id: 'menuWhere', target: '.menu' }]}
        onShowTab={jest.fn()}
        onClose={jest.fn()}
        initialDontShowAgain={false}
        guide
      />
    );
    expect(document.querySelector('.tour-spotlight')).toHaveStyle({ top: '192px' });
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('on phones keeps the element clear of the card: scroll margins and a clipped highlight', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 700, configurable: true });
    const small = placeTarget('near-top', 100, 50).element;
    const big = placeTarget('tall', 100, 600).element;
    const real = Element.prototype.getBoundingClientRect;
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      return this.getAttribute('role') === 'dialog'
        ? ({ height: 200, width: 300, top: 0, left: 0, bottom: 200, right: 300 } as DOMRect)
        : real.call(this);
    });
    const centre = jest.spyOn(small, 'scrollIntoView');
    const start = jest.spyOn(big, 'scrollIntoView');
    const view = renderTour();

    next(); // fits in the free area: centred between the header and the card
    expect(small.style.scrollMarginTop).toBe('12px'); // no scroll-padding in jsdom
    expect(document.body.style.paddingBottom).toBe('364px'); // room to scroll short pages
    expect(small.style.scrollMarginBottom).toBe('224px');
    expect(centre).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });

    next();
    next(); // taller than the free area: top aligned and clipped above the card
    expect(start).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    expect(small.style.scrollMarginBottom).toBe(''); // margins are given back
    expect(document.querySelector('.tour-spotlight')).toHaveStyle({ top: '92px', height: '392px' });
    view.unmount();
    expect(big.style.scrollMarginTop).toBe('');
    expect(document.body.style.paddingBottom).toBe('');
  });

  it('scrolls below the bars the page pins to the top, and leaves pinned targets alone', () => {
    const pin = (id: string, top: number, bottom: number, width: number, position = 'sticky') => {
      const { element } = placeTarget(id, top, bottom - top, 0, width);
      element.style.position = position;
      return element;
    };
    pin('header', 0, 120, 1024); // pinned bar: counts
    pin('side-button', 0, 300, 100, 'fixed'); // too narrow to be a bar
    pin('overlay', 0, 768, 1024, 'fixed'); // full-screen overlay (closed side menu): not a bar
    pin('table-head', 400, 450, 1024); // outside the top of the screen
    const target = placeTarget('near-top', 300, 50).element;
    const scroll = jest.spyOn(target, 'scrollIntoView');
    const pinned = pin('near-bottom', 600, 640, 300, 'fixed');
    const nearest = jest.spyOn(pinned, 'scrollIntoView');
    renderTour();
    card().style.position = 'fixed'; // the tour's own elements never count as page bars

    next();
    expect(target.style.scrollMarginTop).toBe('132px'); // 120 + the gap
    expect(scroll).toHaveBeenCalled();

    next(); // pinned: the page keeps it on screen; only its own box may scroll (the side menu)
    expect(nearest).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
    expect(pinned.style.scrollMarginTop).toBe('');
    expect(document.querySelector('.tour-spotlight')).not.toBeNull();
  });

  it('ignores a malformed published top-bar height and sits above a target near the bottom edge', () => {
    document.documentElement.style.setProperty('--sticky-bar-height', 'abc');
    placeTarget('near-top', 300, 50);
    placeTarget('near-bottom', 748, 20);
    placeTarget('tall', 10, 758);
    renderTour();

    next();
    next(); // summary: no room below the element, but room above it
    expect(document.querySelector('.tour-spotlight')).not.toBeNull();
    next(); // movements: no room on either side, the card takes the bottom
    expect(card()).toHaveClass('tour-card--bottom');
    document.documentElement.style.removeProperty('--sticky-bar-height');
  });

  it('follows the element when it or the page changes size after it appeared', () => {
    const observed: Array<() => void> = [];
    const disconnect = jest.fn();
    (window as { ResizeObserver?: unknown }).ResizeObserver = class {
      constructor(callback: () => void) {
        observed.push(callback);
      }
      observe() {}
      disconnect() {
        disconnect();
      }
    };
    const { element, rect } = placeTarget('near-top', 100, 50);
    const scroll = jest.spyOn(element, 'scrollIntoView');
    const view = renderTour();
    next();
    expect(scroll).toHaveBeenCalledTimes(1);
    rect.height = 120;
    rect.bottom = 220;
    act(() => observed.forEach((callback) => callback()));
    expect(document.querySelector('.tour-spotlight')).toHaveStyle({ height: '136px' });
    // The page grew (something loaded above it): it is brought back into view.
    expect(scroll).toHaveBeenCalledTimes(2);
    view.unmount();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });

  it('centres the card when the highlighted element is not shown (hidden on this screen)', () => {
    jest.useFakeTimers();
    placeTarget('near-top', 100, 50, 40, 0); // no width
    placeTarget('near-bottom', 600, 0); // no height
    renderTour();
    next();
    act(() => {
      jest.advanceTimersByTime(3500);
    });
    expect(document.querySelector('.tour-spotlight')).toBeNull();
    expect(card()).toHaveClass('tour-card--center');
    next();
    act(() => {
      jest.advanceTimersByTime(3500);
    });
    expect(document.querySelector('.tour-spotlight')).toBeNull();
    expect(card()).toHaveClass('tour-card--center');
  });
});

describe('tour steps', () => {
  it('explains the month, the menu, the Renta and the self-employed, adapted to the plan', () => {
    const free = tourSteps(false).map((s) => s.id);
    const premium = tourSteps(true).map((s) => s.id);
    expect(free).toHaveLength(premium.length);
    expect(free).toEqual(expect.arrayContaining(['monthNav', 'selection', 'import', 'invite']));
    expect(free).toEqual(expect.arrayContaining(['rentaSteps', 'autoQuarter', 'autoFiles']));
    expect(free).toEqual(expect.arrayContaining(['rentaPlanFree', 'autoPlanFree']));
    expect(premium).toEqual(expect.arrayContaining(['rentaPlanPremium', 'autoPlanPremium']));
    expect(premium).not.toContain('rentaPlanFree');
  });

  it('explains automatic operations, shared expenses and the crypto console in menu order', () => {
    const free = tourSteps(false);
    const ids = free.map((s) => s.id);
    // «My money» (goals, shared expenses, automatic operations), then taxes, then «Learn».
    const order = ['goals', 'split', 'automations', 'autoPlanFree', 'cryptoIntro', 'settings'];
    const at = order.map((id) => ids.indexOf(id));
    expect(at).not.toContain(-1);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(ids).toEqual(expect.arrayContaining(['splitSettle', 'cryptoChart', 'cryptoTrade']));
    const byId = Object.fromEntries(free.map((s) => [s.id, s]));
    expect(byId.split).toMatchObject({ tab: 'split', target: '[data-tour="split-new"]' });
    expect(byId.automations).toMatchObject({ tab: 'automations' });
    expect(byId.automationsNewFree).toMatchObject({ target: '[data-tour="recurring-new"]' });
    expect(byId.cryptoChart).toMatchObject({ tab: 'crypto', target: '.cc-market-chart' });
    expect(byId.cryptoTrade).toMatchObject({ tab: 'crypto', target: '.cc-order' });
    // The limit of the free plan is only told to whoever has it.
    expect(tr('app.tour.automationsNewFree.body')).toMatch(/hasta 5/);
    expect(tourSteps(true).map((s) => s.id)).toContain('automationsNewPremium');
    // The console is a simulator with play money, said in its first step.
    expect(tr('app.tour.cryptoIntro.body')).toMatch(/10\.000 € virtuales/);
    expect(tr('app.tour.cryptoIntro.body')).toMatch(/No es dinero real/);
  });

  it('explains «Tu dinero perdido» and the date of the goals after the goals', () => {
    const free = tourSteps(false);
    const ids = free.map((s) => s.id);
    expect(ids.slice(ids.indexOf('goals'), ids.indexOf('goals') + 3)).toEqual([
      'goals',
      'goalDate',
      'leaks',
    ]);
    const byId = Object.fromEntries(free.map((s) => [s.id, s]));
    expect(byId.goalDate).toMatchObject({ tab: 'goals', target: '[data-tour="goal-date"]' });
    expect(byId.leaks).toMatchObject({ tab: 'leaks', target: '[data-tour="section"]' });
    // A renewed tour is offered again to whoever turned it off, telling what is new.
    expect(TOUR_VERSION).toBe(5);
    expect(tr('app.tour.offer.body')).toMatch(/5 pasos/);
  });

  it('opens with five steps: what it is, adding data, the month, the menu and the plan', () => {
    expect(shortTourSteps().map((s) => s.id)).toEqual([
      'intro',
      'addData',
      'monthSummary',
      'menuWhere',
      'planWhere',
    ]);
    expect(tr('app.tour.addData.body')).toMatch(/pegar el texto/);
    expect(tr('app.tour.addData.body')).toMatch(/captura/);
    expect(tr('app.tour.addData.body')).toMatch(/«café 1,50»/);
  });

  it('keeps the rest as the guide of each section, without the general steps', () => {
    expect(sectionGuideSteps('automations', false).map((s) => s.id)).toEqual([
      'automations',
      'automationsNewFree',
    ]);
    expect(sectionGuideSteps('automations', true).map((s) => s.id)).toContain(
      'automationsNewPremium'
    );
    expect(sectionGuideSteps('split', false).map((s) => s.id)).toEqual(['split', 'splitSettle']);
    expect(sectionGuideSteps('crypto', false).map((s) => s.id)).toEqual([
      'cryptoIntro',
      'cryptoChart',
      'cryptoTrade',
    ]);
    const monthly = sectionGuideSteps('monthly', false).map((s) => s.id);
    expect(monthly).toEqual(expect.arrayContaining(['monthNav', 'import', 'selection']));
    expect(monthly).not.toEqual(expect.arrayContaining(['welcome']));
    expect(monthly).not.toContain('menu');
    expect(monthly).not.toContain('done');
    expect(sectionGuideSteps('search', false)).toEqual([]);
    // Every step of the full tour is still somewhere: its own section or the general ones.
    const inGuides = new Set(
      tourSteps(false).flatMap((s) => sectionGuideSteps(s.tab!, false).map((g) => g.id))
    );
    const left = tourSteps(false).filter((s) => !inGuides.has(s.id));
    expect(left.map((s) => s.id)).toEqual([
      'welcome',
      'menu',
      'invite',
      'profile',
      'learn',
      'done',
    ]);
  });

  it('has a text in every language for every step', () => {
    for (const premium of [false, true]) {
      for (const step of [...tourSteps(premium), ...shortTourSteps()]) {
        expect(tr(`app.tour.${step.id}.title`)).not.toBe(`app.tour.${step.id}.title`);
        expect(tr(`app.tour.${step.id}.body`)).not.toBe(`app.tour.${step.id}.body`);
      }
    }
  });
});

/** Signs in from inside the app, as the login page does. */
function SignInButton() {
  const { login } = useAuth();
  return <button onClick={() => void login('ana@example.com', 'secret')}>entrar</button>;
}

const openSettings = () => {
  fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
  const menu = screen.getByRole('dialog', { name: tr('app.menu.ariaLabel') });
  fireEvent.click(within(menu).getByRole('button', { name: new RegExp(tr('app.tabs.settings')) }));
};

describe('Welcome tour in the dashboard', () => {
  const signInAgain = () => {
    jest.spyOn(authApi, 'login').mockResolvedValue({
      accessToken: fakeAccessToken(),
      refreshToken: 'r2',
      user: f.user(),
    });
    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
  };

  it('opens the short tour after signing in, five steps on the month', async () => {
    const { api } = renderWithProviders(
      <>
        <SignInButton />
        <Dashboard />
      </>
    );
    await screen.findByText(tr('app.nav.currentMonth'));
    signInAgain();
    const total = shortTourSteps().length;
    expect(total).toBe(5);
    expect(
      await screen.findByRole('heading', { name: tr('app.tour.intro.title') })
    ).toBeInTheDocument();
    for (let step = 1; step < total; step++) next();
    expect(
      screen.getByRole('heading', { name: tr('app.tour.planWhere.title') })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.tour.finish') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: tr('app.tabs.monthly') })).toBeInTheDocument();
    expect(api.settingsApi.update).not.toHaveBeenCalled();
  });

  it('waits for the updated terms of sale to be accepted before it opens', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(
      f.billing({
        terms: {
          version: '2026-10-18',
          acceptedVersion: '2026-10-14',
          acceptedAt: '2026-10-14T10:00:00Z',
          mustAccept: true,
        },
      })
    );
    renderWithProviders(
      <>
        <SignInButton />
        <Dashboard />
      </>,
      { api, plan: true }
    );
    await screen.findByText(tr('app.nav.currentMonth'));
    signInAgain();
    expect(
      await screen.findByRole('dialog', { name: tr('terms.update.title') })
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: tr('app.tour.welcome.title') })).toBeNull();
  });

  it('can be turned off from the tour and stays off', async () => {
    const api = createFakeApi();
    renderWithProviders(
      <>
        <SignInButton />
        <Dashboard />
      </>,
      { api }
    );
    await screen.findByText(tr('app.nav.currentMonth'));
    signInAgain();
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.tour.dontShowAgain') }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.tour.skip') }));
    expect(api.settingsApi.update).toHaveBeenCalledWith({ showTour: false });
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe(String(TOUR_VERSION));
  });

  it('shows the Premium wording of the plan steps to Premium users', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    renderWithProviders(<Dashboard />, { api, plan: true });
    await screen.findByText(tr('app.nav.currentMonth'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.tabs.settings')) }));
    fireEvent.click(await screen.findByRole('button', { name: /Ver el recorrido completo/ }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: tr('app.tour.welcome.title') })
    ).toBeInTheDocument();
    const ids = tourSteps(true).map((s) => s.id);
    const at = ids.indexOf('rentaPlanPremium');
    for (let step = 0; step < at; step++) next();
    expect(
      within(dialog).getByRole('heading', { name: tr('app.tour.rentaPlanPremium.title') })
    ).toBeInTheDocument();
  });

  it('does not open when the user asked not to see it', async () => {
    const api = createFakeApi();
    api.settingsApi.get.mockResolvedValue(f.settings({ showTour: false }));
    renderWithProviders(
      <>
        <SignInButton />
        <Dashboard />
      </>,
      { api }
    );
    await screen.findByText(tr('app.nav.currentMonth'));
    signInAgain();
    await waitFor(() => expect(authApi.login).toHaveBeenCalled());
    await act(async () => undefined);
    expect(screen.queryByRole('dialog', { name: tr('app.tour.intro.title') })).toBeNull();
  });

  describe('the renewed tour is offered once to whoever turned it off', () => {
    async function signInWithTourOff() {
      const api = createFakeApi();
      api.settingsApi.get.mockResolvedValue(f.settings({ showTour: false }));
      renderWithProviders(
        <>
          <SignInButton />
          <Dashboard />
        </>,
        { api }
      );
      await screen.findByText(tr('app.nav.currentMonth'));
      signInAgain();
    }

    it('shows a notice that does not block, and «not now» hides it for good', async () => {
      await signInWithTourOff();
      const notice = await screen.findByRole('region', { name: tr('app.tour.offer.title') });
      expect(screen.queryByRole('dialog', { name: tr('app.tour.intro.title') })).toBeNull();
      fireEvent.click(within(notice).getByRole('button', { name: tr('app.tour.offer.dismiss') }));
      expect(screen.queryByRole('region', { name: tr('app.tour.offer.title') })).toBeNull();
      expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe(String(TOUR_VERSION));
    });

    it('«see the tour» starts it from the first step', async () => {
      await signInWithTourOff();
      fireEvent.click(await screen.findByRole('button', { name: tr('app.tour.offer.view') }));
      expect(
        await screen.findByRole('heading', { name: tr('app.tour.intro.title') })
      ).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: tr('app.tour.offer.title') })).toBeNull();
    });

    it('is offered to whoever only saw the previous version, telling what is new', async () => {
      localStorage.setItem(TOUR_SEEN_KEY, String(TOUR_VERSION - 1));
      await signInWithTourOff();
      const notice = await screen.findByRole('region', { name: tr('app.tour.offer.title') });
      expect(notice).toHaveTextContent(/5 pasos/);
      expect(notice).toHaveTextContent(/¿Cómo funciona\?/);
    });

    it('is not offered again once this version was seen', async () => {
      localStorage.setItem(TOUR_SEEN_KEY, String(TOUR_VERSION));
      await signInWithTourOff();
      await waitFor(() => expect(authApi.login).toHaveBeenCalled());
      await act(async () => undefined);
      expect(screen.queryByRole('region', { name: tr('app.tour.offer.title') })).toBeNull();
    });
  });

  it('replays from Settings and returns there, saving a changed preference', async () => {
    const api = createFakeApi();
    api.settingsApi.get.mockResolvedValue(f.settings({ showTour: false, showOffers: false }));
    api.settingsApi.update.mockRejectedValue(new Error('offline'));
    renderWithProviders(<Dashboard />, { api });
    openSettings();
    fireEvent.click(await screen.findByRole('button', { name: /Ver el tour ahora/ }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(
        tr('app.tour.progress', { current: 1, total: shortTourSteps().length })
      )
    ).toBeInTheDocument();
    const checkbox = within(dialog).getByRole('checkbox');
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(api.settingsApi.update).toHaveBeenCalledWith({ showTour: true });
    expect(
      await screen.findByRole('region', { name: tr('app.tabs.settings') })
    ).toBeInTheDocument();
  });

  it('opens the guide of a section with «How does it work?» and returns to it', async () => {
    const { api } = renderWithProviders(<Dashboard />);
    await screen.findByText(tr('app.nav.currentMonth'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
    const menu = screen.getByRole('dialog', { name: tr('app.menu.ariaLabel') });
    fireEvent.click(within(menu).getByRole('button', { name: new RegExp(tr('app.tabs.split')) }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: tr('app.tour.guide.aria', { section: tr('app.tabs.split') }),
      })
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(tr('app.tour.progress', { current: 1, total: 2 }))
    ).toBeVisible();
    expect(within(dialog).getByRole('heading', { name: tr('app.tour.split.title') })).toBeVisible();
    // A guide never opens by itself: nothing to turn off.
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.tour.closeGuide') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: tr('app.tabs.split') })).toBeInTheDocument();
    expect(api.settingsApi.update).not.toHaveBeenCalled();
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBeNull();
    // Sections without a guide have no button.
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: tr('app.menu.ariaLabel') })).getByRole('button', {
        name: new RegExp(tr('app.tabs.search')),
      })
    );
    await screen.findByRole('region', { name: tr('app.tabs.search') });
    expect(screen.queryByRole('button', { name: /¿Cómo funciona\?/ })).toBeNull();
  });

  it('switches the tour on and off from Settings', async () => {
    const { api } = renderWithProviders(<Dashboard />);
    openSettings();
    fireEvent.click(await screen.findByRole('checkbox', { name: tr('app.settings.showTour') }));
    await waitFor(() => expect(api.settingsApi.update).toHaveBeenCalledWith({ showTour: false }));
  });
});
