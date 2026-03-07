import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@shared/hooks/useAuth';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { AuthPage } from '@shared/components/AuthPage';
import { ApiProvider } from '@core/context/ApiContext';
import { FinancesProvider } from './modules/finances/application/FinancesContext';
import { Dashboard } from './modules/finances/ui/components/Dashboard';
import { VerifyEmailPage } from './modules/auth/ui/VerifyEmailPage';
import { ResetPasswordPage } from './modules/auth/ui/ResetPasswordPage';
import { I18nProvider } from '@core/i18n/I18nContext';
import { UpdatePrompt } from '@shared/components/UpdatePrompt';

export default function App() {
    return (
        <I18nProvider>
            <AuthProvider>
                <ApiProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/login" element={<AuthPage />} />
                            <Route path="/verify-email" element={<VerifyEmailPage />} />
                            <Route path="/reset-password" element={<ResetPasswordPage />} />
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
                    <UpdatePrompt />
                </ApiProvider>
            </AuthProvider>
        </I18nProvider>
    );
}

