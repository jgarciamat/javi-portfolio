import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@shared/hooks/useAuth';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { AuthPage } from '@shared/components/AuthPage';
import { ApiProvider } from '@core/context/ApiContext';
import { FinancesProvider } from './modules/finances/application/FinancesContext';
import { Dashboard } from './modules/finances/ui/components/Dashboard';
import { VerifyEmailPage } from './modules/auth/ui/VerifyEmailPage';

export default function App() {
    return (
        <AuthProvider>
            <ApiProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<AuthPage />} />
                        <Route path="/verify-email" element={<VerifyEmailPage />} />
                        <Route element={<ProtectedRoute />}>
                            <Route path="/" element={
                                <FinancesProvider>
                                    <Dashboard />
                                </FinancesProvider>
                            } />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </ApiProvider>
        </AuthProvider>
    );
}

