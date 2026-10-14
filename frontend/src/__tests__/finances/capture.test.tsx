import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import * as capture from '@core/capture/notificationCapture';
import { CaptureCard } from '@modules/finances/ui/components/CaptureCard';
import { CapturedPayments } from '@modules/finances/ui/components/CapturedPayments';
import { CAPTURE_PACKAGES } from '@modules/finances/domain/bankNotifications';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

jest.mock('@core/capture/notificationCapture', () => ({
  captureSupported: jest.fn(() => true),
  captureStatus: jest.fn().mockResolvedValue({ listenerEnabled: false, enabled: false }),
  openCaptureSettings: jest.fn().mockResolvedValue(undefined),
  configureCapture: jest.fn().mockResolvedValue(undefined),
  drainCaptured: jest.fn().mockResolvedValue([]),
}));

const mocked = capture as jest.Mocked<typeof capture>;
const postedAt = new Date(2026, 2, 15, 9, 0).getTime();

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mocked.captureSupported.mockReturnValue(true);
  mocked.captureStatus.mockResolvedValue({ listenerEnabled: false, enabled: false });
  mocked.drainCaptured.mockResolvedValue([]);
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

const notification = (text: string, title = 'BBVA', time = postedAt) => ({
  packageName: 'com.bbva.bbvacontigo',
  title,
  text,
  postedAt: time,
});

describe('Detect bank payments (settings)', () => {
  const premium = () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    return api;
  };

  it('only exists in the Android app', () => {
    mocked.captureSupported.mockReturnValue(false);
    renderWithProviders(<CaptureCard />, { api: premium(), plan: true });
    expect(screen.queryByText(tr('app.capture.title'))).toBeNull();
  });

  it('is part of Premium', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'free' }));
    renderWithProviders(<CaptureCard />, { api, plan: true });
    expect(await screen.findByText(tr('app.capture.locked'))).toBeInTheDocument();
  });

  it('is off until it is turned on, then asks for access to the notifications', async () => {
    renderWithProviders(<CaptureCard />, { api: premium(), plan: true });
    const toggle = await screen.findByRole('checkbox', { name: tr('app.capture.toggle') });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByText(tr('app.capture.needsAccess'))).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(localStorage.getItem('mm_capture_enabled')).toBe('1');
    expect(mocked.configureCapture).toHaveBeenLastCalledWith(true, CAPTURE_PACKAGES);
    expect(await screen.findByText(tr('app.capture.needsAccess'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.capture.giveAccess') }));
    expect(mocked.openCaptureSettings).toHaveBeenCalled();
  });

  it('says it is active once the access was given, also when coming back from the settings', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    renderWithProviders(<CaptureCard />, { api: premium(), plan: true });
    expect(await screen.findByText(tr('app.capture.needsAccess'))).toBeInTheDocument();
    expect(mocked.configureCapture).toHaveBeenCalledWith(true, CAPTURE_PACKAGES);
    mocked.captureStatus.mockResolvedValue({ listenerEnabled: true, enabled: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(await screen.findByText(tr('app.capture.active'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.capture.toggle') }));
    expect(localStorage.getItem('mm_capture_enabled')).toBeNull();
    expect(screen.queryByText(tr('app.capture.active'))).toBeNull();
  });

  it('copes with a service that is not there', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    mocked.captureStatus.mockRejectedValue(new Error('nope'));
    mocked.configureCapture.mockRejectedValue(new Error('nope'));
    renderWithProviders(<CaptureCard />, { api: premium(), plan: true });
    expect(await screen.findByText(tr('app.capture.needsAccess'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.capture.toggle') }));
  });
});

describe('Detected payments', () => {
  const setup = (api = createFakeApi()) => {
    renderWithProviders(<CapturedPayments />, { api });
    return api;
  };

  it('does nothing when the detection is off or not available', async () => {
    mocked.drainCaptured.mockResolvedValue([notification('Pago de 5,00 € en BAR')]);
    setup();
    await act(async () => undefined);
    expect(mocked.drainCaptured).not.toHaveBeenCalled();
    expect(screen.queryByText(tr('app.capture.detected'))).toBeNull();
  });

  it('is not shown outside the app', async () => {
    mocked.captureSupported.mockReturnValue(false);
    localStorage.setItem('mm_capture_enabled', '1');
    localStorage.setItem(
      'mm_captured',
      JSON.stringify([
        { id: 'x', description: 'BAR', amount: 5, type: 'EXPENSE', date: '2026-03-15' },
      ])
    );
    setup();
    expect(screen.queryByText(tr('app.capture.detected'))).toBeNull();
  });

  it('suggests the payments found in the notifications and adds one with a tap', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    mocked.drainCaptured.mockResolvedValue([
      notification('Pago con tarjeta de 23,40 € en MERCADONA'),
      notification('Tu saldo es de 100,00 €'),
      notification('Has recibido un Bizum de 20,00 € de Ana', 'Bizum', postedAt + 1),
    ]);
    const api = setup();
    expect(await screen.findByText('MERCADONA')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText(/saldo/)).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: tr('app.capture.addOne', { name: 'MERCADONA' }) })
    );
    await waitFor(() =>
      expect(api.transactionApi.import).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            description: 'MERCADONA',
            amount: -23.4,
            type: 'EXPENSE',
            date: '2026-03-15',
          }),
        ],
        {}
      )
    );
    await waitFor(() => expect(screen.queryByText('MERCADONA')).toBeNull());
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('adds or ignores everything at once, and never suggests the same notification twice', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    const same = notification('Pago de 5,00 € en BAR');
    mocked.drainCaptured.mockResolvedValue([
      same,
      same,
      notification('Has recibido 10,00 € de Ana', 'Bizum', postedAt + 1),
    ]);
    const api = setup();
    await screen.findByText('BAR');
    expect(screen.getAllByText('BAR')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: tr('app.capture.addAll') }));
    await waitFor(() => expect(api.transactionApi.import).toHaveBeenCalled());
    const rows = api.transactionApi.import.mock.calls[0][0];
    expect(rows.map((r: { amount: number }) => r.amount)).toEqual([-5, 10]);
    await waitFor(() => expect(screen.queryByText(tr('app.capture.detected'))).toBeNull());

    // The same notification again does not come back after it was added.
    mocked.drainCaptured.mockResolvedValue([same]);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => undefined);
    expect(screen.queryByText('BAR')).toBeNull();
  });

  it('ignores payments and shows why one could not be added', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    mocked.drainCaptured.mockResolvedValue([
      notification('Pago de 5,00 € en BAR'),
      notification('Pago de 7,00 € en KIOSCO', 'BBVA', postedAt + 1),
    ]);
    const api = setup();
    await screen.findByText('BAR');
    api.transactionApi.import.mockRejectedValueOnce(new Error('Premium requerido'));
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.capture.addOne', { name: 'BAR' }) })
    );
    expect(await screen.findByText('Premium requerido')).toBeInTheDocument();
    expect(screen.getByText('BAR')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.capture.ignoreOne', { name: 'BAR' }) })
    );
    expect(screen.queryByText('BAR')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.capture.addOne', { name: 'KIOSCO' }) })
    );
    await waitFor(() => expect(screen.queryByText(tr('app.capture.detected'))).toBeNull());
  });

  it('ignores them all', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    mocked.drainCaptured.mockResolvedValue([
      notification('Pago de 5,00 € en BAR'),
      notification('Pago de 7,00 € en KIOSCO', 'BBVA', postedAt + 1),
    ]);
    setup();
    await screen.findByText('BAR');
    fireEvent.click(screen.getByRole('button', { name: tr('app.capture.ignoreAll') }));
    expect(screen.queryByText(tr('app.capture.detected'))).toBeNull();
  });

  it('keeps going when the service fails or the tab is hidden', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    mocked.drainCaptured.mockRejectedValue(new Error('service down'));
    setup();
    await act(async () => undefined);
    expect(mocked.drainCaptured).toHaveBeenCalledTimes(1);
    const hidden = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mocked.drainCaptured).toHaveBeenCalledTimes(1);
    hidden.mockRestore();
  });
});
