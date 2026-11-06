import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import * as capture from '@core/capture/notificationCapture';
import * as notifications from '@core/notifications/notifications';
import { CaptureCard } from '@modules/finances/ui/components/CaptureCard';
import { CAPTURE_PACKAGES, type DetectedPayment } from '@modules/finances/domain/bankNotifications';
import {
  addPending,
  captureAlert,
  captureConsented,
  learningEnabled,
  loadPending,
  loadStreak,
  restorePending,
  saveStreak,
  setCaptureAlert,
} from '@modules/finances/application/capturedPayments';
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
  reportWaiting: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@core/notifications/notifications', () => ({
  requestNotificationPermission: jest.fn().mockResolvedValue(true),
}));

const mocked = capture as jest.Mocked<typeof capture>;
const permission = notifications.requestNotificationPermission as jest.Mock;
const postedAt = new Date(2026, 2, 15, 9, 0).getTime();

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mocked.captureSupported.mockReturnValue(true);
  mocked.captureStatus.mockResolvedValue({ listenerEnabled: false, enabled: false });
  mocked.configureCapture.mockResolvedValue(undefined);
  permission.mockResolvedValue(true);
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

const alertsWith = (alert: string) => expect.objectContaining({ alert, texts: expect.any(Object) });

describe('Detect bank payments (settings)', () => {
  const free = (captures = 4) => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(
      f.billing({
        plan: 'free',
        limits: f.catalog().limits.free,
        usage: { ...f.billing().usage, captures },
      })
    );
    return api;
  };

  it('only exists in the Android app', () => {
    mocked.captureSupported.mockReturnValue(false);
    renderWithProviders(<CaptureCard />, { api: free(), plan: true });
    expect(screen.queryByText(tr('app.capture.title'))).toBeNull();
  });

  it('is on every plan: the free one says how many it added this month', async () => {
    renderWithProviders(<CaptureCard />, { api: free(), plan: true });
    expect(
      await screen.findByText(tr('app.capture.freeLimit', { used: 4, limit: 15 }))
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: tr('app.capture.toggle') })).toBeInTheDocument();
    expect(mocked.configureCapture).toHaveBeenCalledWith(
      false,
      CAPTURE_PACKAGES,
      alertsWith('daily')
    );
  });

  it('says what it reads before the system settings, and opens nothing without «Entendido»', async () => {
    renderWithProviders(<CaptureCard />);
    const toggle = await screen.findByRole('checkbox', { name: tr('app.capture.toggle') });
    fireEvent.click(toggle);
    const dialog = screen.getByRole('dialog', { name: tr('app.capture.disclosure.title') });
    expect(within(dialog).getByText(tr('app.capture.disclosure.reads'))).toBeInTheDocument();
    expect(within(dialog).getByText(tr('app.capture.disclosure.where'))).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.capture.disclosure.later') })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(toggle).not.toBeChecked();
    expect(localStorage.getItem('mm_capture_enabled')).toBeNull();
    expect(mocked.openCaptureSettings).not.toHaveBeenCalled();
    expect(permission).not.toHaveBeenCalled();
  });

  it('turns on after «Entendido», asks to notify and opens the access to the notifications', async () => {
    renderWithProviders(<CaptureCard />);
    fireEvent.click(await screen.findByRole('checkbox', { name: tr('app.capture.toggle') }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.capture.disclosure.accept') }));
    await waitFor(() => expect(mocked.openCaptureSettings).toHaveBeenCalled());
    expect(permission).toHaveBeenCalled();
    expect(captureConsented()).toBe(true);
    expect(localStorage.getItem('mm_capture_enabled')).toBe('1');
    expect(mocked.configureCapture).toHaveBeenLastCalledWith(
      true,
      CAPTURE_PACKAGES,
      alertsWith('daily')
    );
    expect(screen.getByRole('checkbox', { name: tr('app.capture.toggle') })).toBeChecked();
    expect(await screen.findByText(tr('app.capture.needsAccess'))).toBeInTheDocument();
    // The access was given earlier: the button goes straight to the system settings.
    fireEvent.click(screen.getByRole('button', { name: tr('app.capture.giveAccess') }));
    expect(mocked.openCaptureSettings).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not open the system settings when the access is there, nor ask to notify when it is off', async () => {
    mocked.captureStatus.mockResolvedValue({ listenerEnabled: true, enabled: false });
    setCaptureAlert('off');
    permission.mockRejectedValue(new Error('no plugin'));
    renderWithProviders(<CaptureCard />);
    const toggle = await screen.findByRole('checkbox', { name: tr('app.capture.toggle') });
    await act(async () => undefined);
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: tr('app.capture.disclosure.accept') }));
    expect(await screen.findByText(tr('app.capture.active'))).toBeInTheDocument();
    expect(mocked.openCaptureSettings).not.toHaveBeenCalled();
    expect(permission).not.toHaveBeenCalled();
  });

  it('opens the access even if the phone cannot be asked to notify', async () => {
    permission.mockRejectedValue(new Error('no plugin'));
    renderWithProviders(<CaptureCard />);
    fireEvent.click(await screen.findByRole('checkbox', { name: tr('app.capture.toggle') }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.capture.disclosure.accept') }));
    await waitFor(() => expect(mocked.openCaptureSettings).toHaveBeenCalled());
  });

  it('asks first when it was turned on before the notice existed', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    renderWithProviders(<CaptureCard />);
    fireEvent.click(await screen.findByRole('button', { name: tr('app.capture.giveAccess') }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mocked.openCaptureSettings).not.toHaveBeenCalled();
  });

  it('says it is active once the access was given, also when coming back from the settings', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    renderWithProviders(<CaptureCard />);
    expect(await screen.findByText(tr('app.capture.needsAccess'))).toBeInTheDocument();
    mocked.captureStatus.mockResolvedValue({ listenerEnabled: true, enabled: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(await screen.findByText(tr('app.capture.active'))).toBeInTheDocument();
    const hidden = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    hidden.mockRestore();
    expect(mocked.captureStatus).toHaveBeenCalledTimes(2);
  });

  it('turning it off forgets the consent and what was waiting', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    localStorage.setItem('mm_capture_consent', '2026-03-01');
    addPending([{ id: 'x', description: 'BAR', amount: 5, type: 'EXPENSE', date: '2026-03-15' }]);
    renderWithProviders(<CaptureCard />);
    fireEvent.click(await screen.findByRole('checkbox', { name: tr('app.capture.toggle') }));
    expect(localStorage.getItem('mm_capture_enabled')).toBeNull();
    expect(captureConsented()).toBe(false);
    expect(loadPending()).toEqual([]);
    expect(localStorage.getItem('mm_captured_recent')).toBeNull();
    expect(mocked.configureCapture).toHaveBeenLastCalledWith(
      false,
      CAPTURE_PACKAGES,
      alertsWith('daily')
    );
    expect(screen.queryByText(tr('app.capture.alert.title'))).toBeNull();
  });

  it('chooses how to be told about payments to review: once a day by default', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    renderWithProviders(<CaptureCard />);
    const daily = await screen.findByRole('radio', { name: tr('app.capture.alert.daily') });
    expect(daily).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: tr('app.capture.alert.each') }));
    await waitFor(() =>
      expect(mocked.configureCapture).toHaveBeenLastCalledWith(
        true,
        CAPTURE_PACKAGES,
        alertsWith('each')
      )
    );
    expect(permission).toHaveBeenCalledTimes(1);
    expect(captureAlert()).toBe('each');
    fireEvent.click(screen.getByRole('radio', { name: tr('app.capture.alert.off') }));
    await waitFor(() =>
      expect(mocked.configureCapture).toHaveBeenLastCalledWith(
        true,
        CAPTURE_PACKAGES,
        alertsWith('off')
      )
    );
    expect(permission).toHaveBeenCalledTimes(1);
    permission.mockRejectedValue(new Error('no plugin'));
    fireEvent.click(daily);
    await waitFor(() => expect(captureAlert()).toBe('daily'));
    expect(localStorage.getItem('mm_capture_alert')).toBeNull();
  });

  it('turns the rules that learn from «Para revisar» off and on', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    renderWithProviders(<CaptureCard />);
    const learn = await screen.findByRole('checkbox', {
      name: new RegExp(tr('app.capture.learn')),
    });
    expect(learn).toBeChecked();
    fireEvent.click(learn);
    expect(learningEnabled()).toBe(false);
    fireEvent.click(learn);
    expect(learningEnabled()).toBe(true);
  });

  it('copes with a service that is not there', async () => {
    localStorage.setItem('mm_capture_enabled', '1');
    mocked.captureStatus.mockRejectedValue(new Error('nope'));
    mocked.configureCapture.mockRejectedValue(new Error('nope'));
    renderWithProviders(<CaptureCard />);
    expect(await screen.findByText(tr('app.capture.needsAccess'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.capture.toggle') }));
    expect(localStorage.getItem('mm_capture_enabled')).toBeNull();
  });
});

describe('Payments waiting on the phone', () => {
  const WALLET = 'com.google.android.apps.walletnfcrel';
  const BANK = 'com.bbva.bbvacontigo';
  const pay = (id: string, app: string, minutes: number, description = 'MERCADONA') =>
    ({
      id,
      description,
      amount: 23.4,
      type: 'EXPENSE',
      date: '2026-03-15',
      postedAt: postedAt + minutes * 60_000,
      app,
    }) as DetectedPayment;

  it('keeps one of the same payment told by Google Wallet and the bank, the bank one', () => {
    expect(addPending([pay('w', WALLET, 0, 'Pago con tarjeta'), pay('b', BANK, 1)])).toEqual([
      pay('b', BANK, 1),
    ]);
    // Told again later by the wallet: still one.
    expect(addPending([pay('w2', WALLET, 2, 'Pago con tarjeta')]).map((p) => p.id)).toEqual(['b']);
  });

  it('takes the bank one in the place of the wallet one, also when it arrives later', () => {
    addPending([pay('a', BANK, 0, 'BAR'), pay('w', WALLET, 30, 'Pago con tarjeta')]);
    expect(addPending([pay('b', BANK, 32)]).map((p) => p.description)).toEqual([
      'BAR',
      'MERCADONA',
    ]);
  });

  it('does not suggest again a payment already added', () => {
    addPending([pay('b', BANK, 0)]);
    localStorage.setItem('mm_captured', '[]');
    expect(addPending([pay('w', WALLET, 3)])).toEqual([]);
  });

  it('keeps two equal payments in the same app, and payments far apart', () => {
    expect(addPending([pay('1', BANK, 0), pay('2', BANK, 1), pay('3', WALLET, 20)])).toHaveLength(
      3
    );
  });

  it('puts back a payment where it was', () => {
    addPending([pay('1', BANK, 0, 'A'), pay('2', BANK, 30, 'B'), pay('3', BANK, 60, 'C')]);
    localStorage.setItem(
      'mm_captured',
      JSON.stringify([pay('1', BANK, 0, 'A'), pay('3', BANK, 60, 'C')])
    );
    expect(restorePending(pay('2', BANK, 30, 'B'), 1).map((p) => p.description)).toEqual([
      'A',
      'B',
      'C',
    ]);
  });

  it('remembers the category chosen for a shop, only the last ones', () => {
    saveStreak('bar', { category: 'Ocio' });
    expect(loadStreak('bar')).toEqual({ category: 'Ocio' });
    saveStreak('bar', null);
    expect(loadStreak('bar')).toBeUndefined();
    for (let i = 0; i < 120; i++) saveStreak(`shop ${i}`, { category: 'Ocio' });
    expect(loadStreak('shop 0')).toBeUndefined();
    expect(loadStreak('shop 119')).toEqual({ category: 'Ocio' });
  });
});
