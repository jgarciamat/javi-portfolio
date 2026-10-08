import { act, fireEvent, screen } from '@testing-library/react';
import {
  createErrorReporter,
  installErrorReporting,
  reportError,
} from '@core/monitoring/errorReporting';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import { renderWithI18n, tr } from '@test-utils/render';

jest.mock('@shared/utils/navigation', () => ({ redirectTo: jest.fn(), reloadPage: jest.fn() }));
const { reloadPage } = jest.requireMock('@shared/utils/navigation') as { reloadPage: jest.Mock };

const ENDPOINT = 'http://localhost:3000/api/client-errors';
let fetchMock: jest.Mock;

/** Body of the n-th report sent. */
const sent = (n = 0) => JSON.parse(fetchMock.mock.calls[n][1].body as string);

beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue({ ok: true });
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => jest.restoreAllMocks());

describe('createErrorReporter', () => {
  it('posts the error with the current path, keeping the request alive on unload', () => {
    const report = createErrorReporter('/errors');
    const error = new Error('boom');
    report('error', error);
    expect(fetchMock).toHaveBeenCalledWith(
      '/errors',
      expect.objectContaining({ method: 'POST', keepalive: true })
    );
    expect(sent()).toEqual({ kind: 'error', message: 'boom', stack: error.stack, path: '/' });
  });

  it('describes values that are not errors and errors without a message', () => {
    const report = createErrorReporter('/errors');
    report('unhandledrejection', 'plain reason');
    report('unhandledrejection', new TypeError(''));
    expect(sent(0).message).toBe('plain reason');
    expect(sent(1).message).toBe('TypeError');
  });

  it('sends each message once and at most five per page', () => {
    const report = createErrorReporter('/errors');
    report('error', new Error('same'));
    report('error', new Error('same'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 10; i++) report('error', new Error(`e${i}`));
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('ignores a failed report', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    createErrorReporter('/errors')('error', new Error('x'));
    await act(async () => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends the default reports to the API', () => {
    reportError('error', new Error('default'));
    expect(fetchMock.mock.calls[0][0]).toBe(ENDPOINT);
  });
});

describe('installErrorReporting', () => {
  it('reports uncaught errors and unhandled rejections until removed', () => {
    const report = jest.fn();
    const remove = installErrorReporting(report);
    const error = new Error('uncaught');
    window.dispatchEvent(new ErrorEvent('error', { error }));
    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }));
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'nope' }));
    expect(report.mock.calls).toEqual([
      ['error', error],
      ['error', 'Script error.'],
      ['unhandledrejection', 'nope'],
    ]);
    remove();
    // Without an error object: jsdom would treat an unlistened one as a test failure.
    window.dispatchEvent(new ErrorEvent('error', { message: 'later' }));
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'later' }));
    expect(report).toHaveBeenCalledTimes(3);
  });

  it('uses the API reporter by default', () => {
    const remove = installErrorReporting();
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('global') }));
    remove();
    expect(sent()).toMatchObject({ kind: 'error', message: 'global' });
  });
});

describe('ErrorBoundary', () => {
  let crash = true;
  function Fragile() {
    if (crash) throw new Error('render failed');
    return <p>recovered</p>;
  }

  beforeEach(() => {
    crash = true;
    // React logs every caught render error.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('reports the error, shows a retry screen and renders again on retry', () => {
    renderWithI18n(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('error-screen');
    expect(alert).not.toHaveClass('error-screen--page');
    expect(screen.getByRole('heading', { name: tr('app.error.title') })).toBeInTheDocument();
    expect(sent()).toMatchObject({ kind: 'render', message: 'render failed' });
    crash = false;
    fireEvent.click(screen.getByRole('button', { name: tr('app.error.retry') }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  it('takes the whole page at the top level and can reload the app', () => {
    renderWithI18n(
      <ErrorBoundary fullPage>
        <Fragile />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveClass('error-screen--page');
    fireEvent.click(screen.getByRole('button', { name: tr('app.error.reload') }));
    expect(reloadPage).toHaveBeenCalled();
  });
});

describe('OfflineBanner', () => {
  it('appears while the device is offline', () => {
    const onLine = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    renderWithI18n(<OfflineBanner />);
    expect(screen.queryByRole('status')).toBeNull();

    onLine.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(tr('app.offline.banner'));

    onLine.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
