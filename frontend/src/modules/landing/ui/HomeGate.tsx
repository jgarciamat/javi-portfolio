import { Navigate } from 'react-router-dom';
import { AppSplash } from '@shared/components/AppSplash';
import { LockGate } from '@shared/components/LockGate';
import { useAuth } from '@shared/hooks/useAuth';
import { lazyNamed } from '@shared/utils/lazyNamed';
import { isNativeApp } from '@shared/utils/platform';

const LandingPage = lazyNamed(() => import('./LandingPage'), 'LandingPage');

/**
 * The home address: the app (behind the lock) for people with a session, the login inside the
 * mobile apps and the presentation page for everyone else.
 */
export function HomeGate() {
  const { status } = useAuth();
  if (status === 'loading') return <AppSplash />;
  if (status === 'authenticated') return <LockGate />;
  return isNativeApp() ? <Navigate to="/login" replace /> : <LandingPage />;
}
