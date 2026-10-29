import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@shared/hooks/useAuth';
import { NativeLinks } from '@core/native/NativeLinks';
import { HomeGate } from '@modules/landing/ui/HomeGate';
import { AppLockProvider } from '@shared/hooks/useAppLock';
import { AppSplash } from '@shared/components/AppSplash';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import { ApiProvider } from '@core/context/ApiContext';
import { I18nProvider, withAllTexts } from '@core/i18n/I18nContext';
import { UpdatePrompt } from '@shared/components/UpdatePrompt';
import { SettingsProvider } from '@core/settings/SettingsContext';
import { lazyNamed } from '@shared/utils/lazyNamed';
import { routerBasename } from '@core/i18n/localeUrl';

// Every page is its own chunk: the login screen does not download the dashboard and vice versa.
// The landing, the login and the plans only need the core of the texts; every other page waits for
// the rest with `withAllTexts` (scripts/i18n/split.cjs builds the two parts from these calls).
const AuthPage = lazyNamed(() => import('@shared/components/AuthPage'), 'AuthPage');
const DashboardPage = lazyNamed(
  withAllTexts(() => import('./modules/finances/ui/components/DashboardPage')),
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
  withAllTexts(() => import('./modules/auth/ui/PrivacyPolicyPage')),
  'PrivacyPolicyPage'
);
const PricingPage = lazyNamed(() => import('./modules/billing/ui/PricingPage'), 'PricingPage');
const TermsPage = lazyNamed(
  withAllTexts(() => import('./modules/billing/ui/TermsPage')),
  'TermsPage'
);
const BudgetRulePage = lazyNamed(
  withAllTexts(() => import('./modules/tools/ui/CalculatorPages')),
  'BudgetRulePage'
);
const GuidesIndexPage = lazyNamed(
  withAllTexts(() => import('./modules/guides/ui/GuidePages')),
  'GuidesIndexPage'
);
const GuidePage = lazyNamed(
  withAllTexts(() => import('./modules/guides/ui/GuidePages')),
  'GuidePage'
);
const HaciendaIndexPage = lazyNamed(
  withAllTexts(() => import('./modules/guides/ui/HaciendaPages')),
  'HaciendaIndexPage'
);
const HaciendaGuidePage = lazyNamed(
  withAllTexts(() => import('./modules/guides/ui/HaciendaPages')),
  'HaciendaGuidePage'
);
const VideosPage = lazyNamed(
  withAllTexts(() => import('./modules/guides/ui/VideosPage')),
  'VideosPage'
);
const LoanCalculatorPage = lazyNamed(
  withAllTexts(() => import('./modules/tools/ui/CalculatorPages')),
  'LoanCalculatorPage'
);
const VatCalculatorPage = lazyNamed(
  withAllTexts(() => import('./modules/tools/ui/CalculatorPages')),
  'VatCalculatorPage'
);
const InflationCalculatorPage = lazyNamed(
  withAllTexts(() => import('./modules/tools/ui/CalculatorPages')),
  'InflationCalculatorPage'
);
const RentaCalculatorPage = lazyNamed(
  withAllTexts(() => import('./modules/tools/ui/CalculatorPages')),
  'RentaCalculatorPage'
);
const SalaryCalculatorPage = lazyNamed(
  withAllTexts(() => import('./modules/tools/ui/SalaryCalculator')),
  'SalaryCalculatorPage'
);
const RetaCalculatorPage = lazyNamed(
  withAllTexts(() => import('./modules/tools/ui/RetaCalculator')),
  'RetaCalculatorPage'
);
const GoalCalculatorPage = lazyNamed(
  withAllTexts(() => import('./modules/tools/ui/CalculatorPages')),
  'GoalCalculatorPage'
);
const SavingsSimulatorPage = lazyNamed(
  withAllTexts(() => import('./modules/tools/ui/CalculatorPages')),
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
                <BrowserRouter basename={routerBasename(window.location.pathname)}>
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
                      <Route path="/calculadora-hipoteca" element={<LoanCalculatorPage />} />
                      <Route path="/calculadora-iva" element={<VatCalculatorPage />} />
                      <Route path="/calculadora-inflacion" element={<InflationCalculatorPage />} />
                      <Route path="/calculadora-objetivo-ahorro" element={<GoalCalculatorPage />} />
                      <Route path="/calculadora-renta" element={<RentaCalculatorPage />} />
                      <Route path="/calculadora-sueldo-neto" element={<SalaryCalculatorPage />} />
                      <Route path="/calculadora-cuota-autonomos" element={<RetaCalculatorPage />} />
                      <Route path="/guias" element={<GuidesIndexPage />} />
                      <Route path="/guias/:slug" element={<GuidePage />} />
                      <Route path="/hacienda-paso-a-paso" element={<HaciendaIndexPage />} />
                      <Route path="/hacienda-paso-a-paso/:slug" element={<HaciendaGuidePage />} />
                      <Route path="/videoteca" element={<VideosPage />} />
                      <Route path="/" element={<HomeGate />}>
                        <Route index element={<DashboardPage />} />
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
