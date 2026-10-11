import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@shared/hooks/useAuth';
import { NativeLinks } from '@core/native/NativeLinks';
import { LockGate } from '@shared/components/LockGate';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { AppLockProvider } from '@shared/hooks/useAppLock';
import { AppSplash } from '@shared/components/AppSplash';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import { ApiProvider } from '@core/context/ApiContext';
import { I18nProvider } from '@core/i18n/I18nContext';
import { UpdatePrompt } from '@shared/components/UpdatePrompt';
import { SettingsProvider } from '@core/settings/SettingsContext';
import { lazyNamed } from '@shared/utils/lazyNamed';

// Every page is its own chunk: the login screen does not download the dashboard and vice versa.
const AuthPage = lazyNamed(() => import('@shared/components/AuthPage'), 'AuthPage');
const DashboardPage = lazyNamed(
  () => import('./modules/finances/ui/components/DashboardPage'),
  'DashboardPage'
);
const VerifyEmailPage = lazyNamed(
  () => import('./modules/auth/ui/VerifyEmailPage'),
  'VerifyEmailPage'
);
const ResetPasswordPage = lazyNamed(
  () => import('./modules/auth/ui/ResetPasswordPage'),
  'ResetPasswordPage'
);
const PrivacyPolicyPage = lazyNamed(
  () => import('./modules/auth/ui/PrivacyPolicyPage'),
  'PrivacyPolicyPage'
);
const PricingPage = lazyNamed(() => import('./modules/billing/ui/PricingPage'), 'PricingPage');
const TermsPage = lazyNamed(() => import('./modules/billing/ui/TermsPage'), 'TermsPage');
const BudgetRulePage = lazyNamed(
  () => import('./modules/tools/ui/CalculatorPages'),
  'BudgetRulePage'
);
const GuidesIndexPage = lazyNamed(
  () => import('./modules/guides/ui/GuidePages'),
  'GuidesIndexPage'
);
const GuidePage = lazyNamed(() => import('./modules/guides/ui/GuidePages'), 'GuidePage');
const SavingsSimulatorPage = lazyNamed(
  () => import('./modules/tools/ui/CalculatorPages'),
  'SavingsSimulatorPage'
);

export default function App() {
  return (
    <I18nProvider>
      <ErrorBoundary fullPage>
        <AuthProvider>
          <AppLockProvider>
            <ApiProvider>
              <SettingsProvider>
                <BrowserRouter>
                  <NativeLinks />
                  <Suspense fallback={<AppSplash />}>
                    <Routes>
                      <Route path="/login" element={<AuthPage />} />
                      <Route path="/verify-email" element={<VerifyEmailPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/pricing" element={<PricingPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/calculadora-50-30-20" element={<BudgetRulePage />} />
                      <Route path="/simulador-ahorro" element={<SavingsSimulatorPage />} />
                      <Route path="/guias" element={<GuidesIndexPage />} />
                      <Route path="/guias/:slug" element={<GuidePage />} />
                      <Route element={<ProtectedRoute />}>
                        <Route element={<LockGate />}>
                          <Route path="/" element={<DashboardPage />} />
                        </Route>
                      </Route>
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </SettingsProvider>
            </ApiProvider>
          </AppLockProvider>
        </AuthProvider>
      </ErrorBoundary>
      {/* Outside the boundary: a new version may be the fix for a crash. */}
      <UpdatePrompt />
      <OfflineBanner />
    </I18nProvider>
  );
}
