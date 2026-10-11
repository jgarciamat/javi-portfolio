import { render, screen, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NativeLinks, parseAddLink } from '@core/native/NativeLinks';

jest.mock('@capacitor/app', () => ({
  App: { getLaunchUrl: jest.fn(), addListener: jest.fn() },
}));
const app = (
  jest.requireMock('@capacitor/app') as { App: { getLaunchUrl: jest.Mock; addListener: jest.Mock } }
).App;

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{`${pathname}${search}`}</p>;
};

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/start']}>
      <NativeLinks />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  app.getLaunchUrl.mockResolvedValue(null);
  app.addListener.mockResolvedValue({ remove: jest.fn() });
});
afterEach(() => jest.restoreAllMocks());

describe('parseAddLink', () => {
  it('understands the widget links only', () => {
    expect(parseAddLink('moneymanager://add/expense')).toBe('expense');
    expect(parseAddLink('moneymanager://add/income/')).toBe('income');
    expect(parseAddLink('moneymanager://add/saving')).toBeNull();
    expect(parseAddLink('https://example.com/add/expense')).toBeNull();
    expect(parseAddLink(undefined)).toBeNull();
  });
});

describe('NativeLinks', () => {
  it('does nothing in a browser', () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    mount();
    expect(app.addListener).not.toHaveBeenCalled();
    expect(screen.getByTestId('where')).toHaveTextContent('/start');
  });

  it('opens the form when the app was launched by the widget', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    app.getLaunchUrl.mockResolvedValue({ url: 'moneymanager://add/expense' });
    mount();
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/?add=expense'));
  });

  it('opens the form when the widget is tapped while the app is open, and stops listening', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const remove = jest.fn();
    let listener: (e: { url: string }) => void = () => undefined;
    app.addListener.mockImplementation(async (_name: string, cb: typeof listener) => {
      listener = cb;
      return { remove };
    });
    const view = mount();
    await waitFor(() => expect(app.addListener).toHaveBeenCalled());
    listener({ url: 'moneymanager://add/income' });
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/?add=income'));
    listener({ url: 'moneymanager://other' });
    expect(screen.getByTestId('where')).toHaveTextContent('/?add=income');
    view.unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('removes the listener even if the screen closed before it was ready', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const remove = jest.fn();
    app.addListener.mockResolvedValue({ remove });
    const view = mount();
    view.unmount();
    await waitFor(() => expect(remove).toHaveBeenCalled());
  });
});
