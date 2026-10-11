import { Outlet } from 'react-router-dom';
import { useAppLock } from '@shared/hooks/useAppLock';
import { LockScreen } from './LockScreen';

/** The signed-in app, behind the lock screen while it is locked. */
export function LockGate() {
  const { locked } = useAppLock();
  return locked ? <LockScreen /> : <Outlet />;
}
