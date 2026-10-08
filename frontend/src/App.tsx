import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@shared/hooks/useAuth';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { AuthPage } from '@shared/components/AuthPage';
import { ApiProvider } from '@core/context/ApiContext';
import { FinancesProvider } from './modules/finances/application/FinancesContext';
import { Dashboard } from './modules/finances/ui/components/Dashboard';
import { VerifyEmailPage } from './modules/auth/ui/VerifyEmailPage';
import { ResetPasswordPage } from './modules/auth/ui/ResetPasswordPage';
import { PrivacyPolicyPage } from './modules/auth/ui/PrivacyPolicyPage';
import { I18nProvider } from '@core/i18n/I18nContext';
import { UpdatePrompt } from '@shared/components/UpdatePrompt';
import { SettingsProvider } from '@core/settings/SettingsContext';
import { PlanProvider } from './modules/billing/application/PlanContext';
import { PricingPage } from './modules/billing/ui/PricingPage';
import { TermsPage } from './modules/billing/ui/TermsPage';

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ApiProvider>
          <SettingsProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/login" element={<AuthPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route
                    path="/"
                    element={
                      <PlanProvider>
                        <FinancesProvider>
                          <Dashboard />
                        </FinancesProvider>
                      </PlanProvider>
                    }
                  />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            <UpdatePrompt />
          </SettingsProvider>
        </ApiProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
