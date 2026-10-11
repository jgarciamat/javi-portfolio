import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { Route, Routes } from 'react-router-dom';
import {
  biometricAvailable,
  biometricUnlock,
  clearLock,
  isValidPin,
  loadLock,
  saveLock,
  updateLockOptions,
  verifyPin,
} from '@core/security/appLock';
import { AppLockCard } from '@modules/finances/ui/components/AppLockCard';
import { LockGate } from '@shared/components/LockGate';
import { useAppLock } from '@shared/hooks/useAppLock';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@aparajita/capacitor-biometric-auth', () => ({
  BiometricAuth: { checkBiometry: jest.fn(), authenticate: jest.fn() },
}));
const biometric = (
  jest.requireMock('@aparajita/capacitor-biometric-auth') as {
    BiometricAuth: { checkBiometry: jest.Mock; authenticate: jest.Mock };
  }
).BiometricAuth;

const native = (value: boolean) => jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(value);

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  biometric.checkBiometry.mockResolvedValue({ isAvailable: false });
  biometric.authenticate.mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('app lock storage', () => {
  it('stores a salted hash and checks PINs against it', async () => {
    const config = await saveLock('1234', { biometric: false, timeoutSec: 60 });
    expect(JSON.stringify(localStorage)).not.toContain('1234');
    expect(config.pinLength).toBe(4);
    expect(loadLock()).toEqual(config);
    expect(await verifyPin(config, '1234')).toBe(true);
    expect(await verifyPin(config, '1235')).toBe(false);
    const other = await saveLock('1234', { biometric: false, timeoutSec: 60 });
    expect(other.salt).not.toBe(config.salt);
    expect(updateLockOptions(other, { timeoutSec: 0 }).timeoutSec).toBe(0);
    expect(loadLock()?.timeoutSec).toBe(0);
    clearLock();
    expect(loadLock()).toBeNull();
  });

  it('accepts PINs of 4 to 6 digits only', () => {
    expect(['1234', '123456', '12345'].every(isValidPin)).toBe(true);
    expect(['123', '1234567', '12a4', ''].some(isValidPin)).toBe(false);
  });
});

describe('device authentication', () => {
  it('is only offered in the app, with something enrolled', async () => {
    native(false);
    expect(await biometricAvailable()).toBe(false);
    native(true);
    biometric.checkBiometry.mockResolvedValue({ isAvailable: true });
    expect(await biometricAvailable()).toBe(true);
    biometric.checkBiometry.mockResolvedValue({ isAvailable: false });
    expect(await biometricAvailable()).toBe(false);
    biometric.checkBiometry.mockRejectedValue(new Error('no plugin'));
    expect(await biometricAvailable()).toBe(false);
  });

  it('says whether the device recognised the owner', async () => {
    expect(await biometricUnlock('r', 'c')).toBe(true);
    biometric.authenticate.mockRejectedValueOnce(new Error('cancelled'));
    expect(await biometricUnlock('r', 'c')).toBe(false);
  });
});

const Secret = () => {
  const { lockNow } = useAppLock();
  return <button onClick={lockNow}>secret content</button>;
};

function renderLocked(options: { biometric?: boolean; timeoutSec?: number } = {}) {
  return saveLock('1234', { biometric: false, timeoutSec: 60, ...options }).then(() =>
    renderWithProviders(
      <Routes>
        <Route element={<LockGate />}>
          <Route path="/" element={<Secret />} />
        </Route>
      </Routes>
    )
  );
}

const pinBox = () => screen.getByLabelText(tr('app.lock.enterPin'));

describe('lock screen', () => {
  it('stays closed until the right PIN is typed, then opens by itself', async () => {
    await renderLocked();
    expect(screen.queryByText('secret content')).toBeNull();
    fireEvent.change(pinBox(), { target: { value: '12a3' } });
    expect(pinBox()).toHaveValue('123');
    fireEvent.change(pinBox(), { target: { value: '9999' } });
    expect(await screen.findByText(tr('app.lock.wrong'))).toBeInTheDocument();
    expect(pinBox()).toHaveValue('');
    fireEvent.change(pinBox(), { target: { value: '1' } });
    expect(screen.queryByText(tr('app.lock.wrong'))).toBeNull();
    fireEvent.change(pinBox(), { target: { value: '1234' } });
    expect(await screen.findByText('secret content')).toBeInTheDocument();
  });

  it('makes the person wait after five wrong PINs', async () => {
    await renderLocked();
    for (let i = 0; i < 5; i++) {
      fireEvent.change(pinBox(), { target: { value: '0000' } });
      await waitFor(() => expect(pinBox()).toHaveValue(''));
    }
    expect(await screen.findByText(tr('app.lock.tooMany'))).toBeInTheDocument();
    expect(pinBox()).toBeDisabled();
    expect(screen.queryByText(tr('app.lock.wrong'))).toBeNull();
  });

  it('signing out forgets the lock', async () => {
    await renderLocked();
    fireEvent.click(screen.getByRole('button', { name: tr('app.lock.forgot') }));
    await waitFor(() => expect(loadLock()).toBeNull());
  });

  it('asks the device first and lets the person try again or use the PIN', async () => {
    native(true);
    biometric.authenticate.mockRejectedValueOnce(new Error('no match'));
    await renderLocked({ biometric: true });
    await waitFor(() => expect(biometric.authenticate).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('secret content')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.lock.useBiometric')) }));
    expect(await screen.findByText('secret content')).toBeInTheDocument();
  });

  it('locks again after the app stayed away long enough', async () => {
    await renderLocked({ timeoutSec: 60 });
    fireEvent.change(pinBox(), { target: { value: '1234' } });
    await screen.findByText('secret content');
    const now = jest.spyOn(Date, 'now');
    const visibility = (state: 'hidden' | 'visible') => {
      Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
    };
    // Back after 10 s: still open. Back after 2 min: locked.
    now.mockReturnValue(1_000_000);
    visibility('hidden');
    now.mockReturnValue(1_010_000);
    visibility('visible');
    expect(screen.getByText('secret content')).toBeInTheDocument();
    now.mockReturnValue(2_000_000);
    visibility('hidden');
    now.mockReturnValue(2_120_000);
    visibility('visible');
    expect(await screen.findByLabelText(tr('app.lock.enterPin'))).toBeInTheDocument();
    // A "visible" without a "hidden" before it changes nothing.
    visibility('visible');
  });

  it('can be locked on demand', async () => {
    await renderLocked();
    fireEvent.change(pinBox(), { target: { value: '1234' } });
    fireEvent.click(await screen.findByText('secret content'));
    expect(await screen.findByLabelText(tr('app.lock.enterPin'))).toBeInTheDocument();
  });
});

describe('app lock settings', () => {
  const type = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { value } });
  const click = (name: string) =>
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}$`) }));

  it('turns the lock on with a valid, repeated PIN', async () => {
    renderWithProviders(<AppLockCard />);
    click(tr('app.lock.enable'));
    click(tr('app.lock.save'));
    expect(await screen.findByText(tr('app.lock.invalidPin'))).toBeInTheDocument();
    type('PIN nuevo', '1234');
    type(tr('app.lock.repeatPin'), '4321');
    click(tr('app.lock.save'));
    expect(await screen.findByText(tr('app.lock.mismatch'))).toBeInTheDocument();
    type(tr('app.lock.repeatPin'), '1234');
    click(tr('app.lock.save'));
    expect(await screen.findByText(new RegExp(tr('app.lock.on')))).toBeInTheDocument();
    expect(loadLock()).toMatchObject({ pinLength: 4, biometric: false, timeoutSec: 60 });
  });

  it('offers the device unlock only where it exists, and changes the delay', async () => {
    native(true);
    biometric.checkBiometry.mockResolvedValue({ isAvailable: true });
    await saveLock('1234', { biometric: false, timeoutSec: 60 });
    renderWithProviders(<AppLockCard />);
    const box = await screen.findByRole('checkbox', { name: tr('app.lock.biometric') });
    fireEvent.click(box);
    await waitFor(() => expect(loadLock()?.biometric).toBe(true));
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.lock.timeout') }), {
      target: { value: '300' },
    });
    await waitFor(() => expect(loadLock()?.timeoutSec).toBe(300));
  });

  it('turns the lock on with the device unlock when the phone has one', async () => {
    native(true);
    biometric.checkBiometry.mockResolvedValue({ isAvailable: true });
    renderWithProviders(<AppLockCard />);
    await waitFor(() => expect(biometric.checkBiometry).toHaveBeenCalled());
    click(tr('app.lock.enable'));
    type('PIN nuevo', '123456');
    type(tr('app.lock.repeatPin'), '123456');
    click(tr('app.lock.save'));
    await waitFor(() => expect(loadLock()).toMatchObject({ pinLength: 6, biometric: true }));
  });

  it('changes the PIN only with the current one', async () => {
    await saveLock('1234', { biometric: false, timeoutSec: 60 });
    renderWithProviders(<AppLockCard />);
    click(tr('app.lock.change'));
    type(tr('app.lock.currentPin'), '0000');
    type('PIN nuevo', '5678');
    type(tr('app.lock.repeatPin'), '5678');
    click(tr('app.lock.save'));
    expect(await screen.findByText(tr('app.lock.wrong'))).toBeInTheDocument();
    type(tr('app.lock.currentPin'), '1234');
    click(tr('app.lock.save'));
    await waitFor(() => expect(screen.queryByText(tr('app.lock.wrong'))).toBeNull());
    const config = loadLock()!;
    expect(await verifyPin(config, '5678')).toBe(true);
  });

  it('turns the lock off only with the PIN, and can be cancelled', async () => {
    await saveLock('1234', { biometric: false, timeoutSec: 60 });
    renderWithProviders(<AppLockCard />);
    click(tr('app.lock.disable'));
    click(tr('app.common.cancel'));
    click(tr('app.lock.disable'));
    type(tr('app.lock.currentPin'), '0000');
    click(tr('app.lock.save'));
    expect(await screen.findByText(tr('app.lock.wrong'))).toBeInTheDocument();
    type(tr('app.lock.currentPin'), '1234');
    click(tr('app.lock.save'));
    await waitFor(() => expect(loadLock()).toBeNull());
    expect(await screen.findByRole('button', { name: tr('app.lock.enable') })).toBeInTheDocument();
  });

  it('can lock right away', async () => {
    await saveLock('1234', { biometric: false, timeoutSec: 60 });
    renderWithProviders(<AppLockCard />);
    click(tr('app.lock.now'));
    expect(screen.getByRole('button', { name: tr('app.lock.now') })).toBeInTheDocument();
  });
});

describe('useAppLock', () => {
  it('must be used inside its provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useAppLock())).toThrow(/AppLockProvider/);
  });
});
