import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';

export function ProtectedRoute() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <div className="app-splash" role="status" aria-live="polite">
        <span className="app-splash-logo" aria-hidden="true">
          💰
        </span>
      </div>
    );
  }
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />;
}
