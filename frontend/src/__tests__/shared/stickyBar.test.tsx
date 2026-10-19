import { useRef } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import {
  STICKY_BAR_HEIGHT,
  useScrollToStart,
  useStickyBarHeight,
} from '@shared/hooks/useStickyBar';
import { createFakeApi } from '@test-utils/fakeApi';
import { literal, renderWithProviders, tr } from '@test-utils/render';

function Bar({ tab = 'a' }: { tab?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useStickyBarHeight(ref);
  useScrollToStart(tab, 2026, 10);
  return <div ref={ref}>bar</div>;
}

const rootHeight = () => document.documentElement.style.getPropertyValue(STICKY_BAR_HEIGHT);
const setBarHeight = (px: number) =>
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: px });

afterEach(() => {
  delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
  delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  jest.restoreAllMocks();
});

describe('useStickyBarHeight', () => {
  it('publishes the bar height, follows its resizes and cleans up', () => {
    let notify = () => {};
    const disconnect = jest.fn();
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      constructor(cb: () => void) {
        notify = cb;
      }
      observe() {}
      disconnect = disconnect;
    };
    setBarHeight(147);
    const { unmount } = render(<Bar />);
    expect(rootHeight()).toBe('147px');
    setBarHeight(66);
    notify();
    expect(rootHeight()).toBe('66px');
    setBarHeight(90);
    fireEvent(window, new Event('resize'));
    expect(rootHeight()).toBe('90px');
    unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(rootHeight()).toBe('');
  });

  it('still works where ResizeObserver does not exist', () => {
    setBarHeight(120);
    const { unmount } = render(<Bar />);
    expect(rootHeight()).toBe('120px');
    unmount();
  });
});

describe('useScrollToStart', () => {
  it('goes back to the top when the key changes while scrolled, never on mount', () => {
    const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 400 });
    const { rerender } = render(<Bar tab="a" />);
    expect(scrollTo).not.toHaveBeenCalled();
    rerender(<Bar tab="a" />);
    expect(scrollTo).not.toHaveBeenCalled();
    rerender(<Bar tab="b" />);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    rerender(<Bar tab="c" />);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});

describe('Dashboard fixed bar', () => {
  it('starts a section at the top and publishes the bar height', async () => {
    const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 300 });
    setBarHeight(147);
    const api = createFakeApi();
    const { unmount } = renderWithProviders(<Dashboard />, { api });
    await waitFor(() => expect(api.monthApi.get).toHaveBeenCalled());
    expect(rootHeight()).toBe('147px');
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
    const menu = screen.getByRole('dialog', { name: tr('app.menu.ariaLabel') });
    fireEvent.click(within(menu).getByRole('button', { name: literal(tr('app.tabs.annual')) }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    unmount();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });
});
