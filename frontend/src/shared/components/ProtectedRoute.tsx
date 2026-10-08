import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { AppSplash } from './AppSplash';

export function ProtectedRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <AppSplash />;
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />;
}
