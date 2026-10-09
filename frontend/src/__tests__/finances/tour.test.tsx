import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { authApi } from '@core/api/authApi';
import { useAuth } from '@shared/hooks/useAuth';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { GuidedTour } from '@modules/finances/ui/tour/GuidedTour';
import { tourSteps, type TourStep } from '@modules/finances/ui/tour/tourSteps';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { fakeAccessToken, renderWithI18n, renderWithProviders, tr } from '@test-utils/render';

afterEach(() => {
  jest.restoreAllMocks();
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
    .mockImplementation(() => ({ ...rect, x: left, y: top, toJSON: () => rect } as DOMRect));
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
    expect(card()).toHaveStyle({ top: '288px' });

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

  it('on phones keeps the element clear of the card: scroll margins and a clipped highlight', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 700, configurable: true });
    const small = placeTarget('near-top', 100, 50).element;
    const big = placeTarget('tall', 100, 600).element;
    const real = Element.prototype.getBoundingClientRect;
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: Element) {
        return this.getAttribute('role') === 'dialog'
          ? ({ height: 200, width: 300, top: 0, left: 0, bottom: 200, right: 300 } as DOMRect)
          : real.call(this);
      });
    const centre = jest.spyOn(small, 'scrollIntoView');
    const start = jest.spyOn(big, 'scrollIntoView');
    const view = renderTour();

    next(); // fits in the free area: centred between the header and the card
    expect(small.style.scrollMarginTop).toBe('12px');
    expect(document.body.style.paddingBottom).toBe('314px'); // room to scroll short pages
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
    const noScroll = jest.spyOn(pinned, 'scrollIntoView');
    renderTour();
    card().style.position = 'fixed'; // the tour's own elements never count as page bars

    next();
    expect(target.style.scrollMarginTop).toBe('132px'); // 120 + the gap
    expect(scroll).toHaveBeenCalled();

    next(); // pinned: the page keeps it on screen, no scrolling, still highlighted
    expect(noScroll).not.toHaveBeenCalled();
    expect(document.querySelector('.tour-spotlight')).not.toBeNull();
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
  it('covers every section and skips the hidden offers', () => {
    const all = tourSteps(true);
    expect(all.map((s) => s.id)).toContain('offers');
    expect(tourSteps(false)).toHaveLength(all.length - 1);
  });
});

/** Signs in from inside the app, as the login page does. */
function SignInButton() {
  const { login } = useAuth();
  return <button onClick={() => void login('ana@example.com', 'secret')}>entrar</button>;
}

const openSettings = () => {
  fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
  const menu = screen.getByRole('complementary', { name: tr('app.menu.ariaLabel') });
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

  it('opens after signing in and visits every section on the way', async () => {
    const { api } = renderWithProviders(
      <>
        <SignInButton />
        <Dashboard />
      </>
    );
    await screen.findByText(tr('app.nav.currentMonth'));
    signInAgain();
    const total = tourSteps(true).length;
    expect(
      await screen.findByRole('heading', { name: tr('app.tour.welcome.title') })
    ).toBeInTheDocument();
    for (let step = 1; step < total; step++) next();
    expect(screen.getByRole('heading', { name: tr('app.tour.done.title') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.tour.finish') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: tr('app.tabs.monthly') })).toBeInTheDocument();
    expect(api.settingsApi.update).not.toHaveBeenCalled();
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
    expect(screen.queryByRole('dialog')).toBeNull();
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
        tr('app.tour.progress', { current: 1, total: tourSteps(false).length })
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

  it('switches the tour on and off from Settings', async () => {
    const { api } = renderWithProviders(<Dashboard />);
    openSettings();
    fireEvent.click(await screen.findByRole('checkbox', { name: tr('app.settings.showTour') }));
    await waitFor(() => expect(api.settingsApi.update).toHaveBeenCalledWith({ showTour: false }));
  });
});
