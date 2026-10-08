import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiProvider } from '@core/context/ApiContext';
import { I18nProvider, translate, type Locale } from '@core/i18n/I18nContext';
import { SettingsProvider } from '@core/settings/SettingsContext';
import { tokenStore } from '@core/api/http';
import { AuthProvider } from '@shared/hooks/useAuth';
import { FinancesProvider } from '@modules/finances/application/FinancesContext';
import { PlanProvider } from '@modules/billing/application/PlanContext';
import type { AuthUser } from '@modules/auth/domain/types';
import { createFakeApi, type FakeApi } from './fakeApi';
import * as fixtures from './fixtures';

/** A JWT-shaped token whose `exp` is one hour away (the client only reads `exp`). */
export function fakeAccessToken(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `h.${payload}.s`;
}

/** Stores a valid session like the app does after logging in. */
export function signIn(user: AuthUser = fixtures.user()): AuthUser {
  tokenStore.setSession(fakeAccessToken(), 'refresh-token');
  localStorage.setItem('mm_user', JSON.stringify(user));
  return user;
}

/** Spanish translation of a key, as the app renders it. */
export const tr = (key: string, vars?: Record<string, string | number>) =>
  translate('es', key, vars);

export interface ProviderOptions {
  api?: FakeApi;
  route?: string;
  locale?: Locale;
  /** Signs in before rendering (default true). */
  authenticated?: boolean;
  /** Wraps in FinancesProvider (default true when authenticated). */
  finances?: boolean;
  /** Wraps in PlanProvider (default false). */
  plan?: boolean;
  /** Signed-in user (default: fixtures.user()). */
  user?: AuthUser;
}

export interface Rendered extends RenderResult {
  api: FakeApi;
}

/** Renders `ui` inside the real providers, talking to a fake API. */
export function renderWithProviders(ui: ReactElement, options: ProviderOptions = {}): Rendered {
  const {
    api = createFakeApi(),
    route = '/',
    locale = 'es',
    authenticated = true,
    finances = authenticated,
    plan = false,
    user,
  } = options;
  localStorage.setItem('mm_locale', locale);
  if (authenticated) signIn(user);

  // A wrapper (not a tree around `ui`) so that `rerender` keeps the providers.
  function Wrapper({ children }: { children: ReactNode }) {
    let tree: ReactNode = children;
    if (finances) tree = <FinancesProvider>{tree}</FinancesProvider>;
    if (plan) tree = <PlanProvider>{tree}</PlanProvider>;
    return (
      <I18nProvider>
        <AuthProvider>
          <ApiProvider value={api}>
            <SettingsProvider>
              <MemoryRouter initialEntries={[route]}>{tree}</MemoryRouter>
            </SettingsProvider>
          </ApiProvider>
        </AuthProvider>
      </I18nProvider>
    );
  }
  const result: RenderResult = render(ui, { wrapper: Wrapper });
  return { ...result, api };
}

/** Only the language provider (for presentational components). */
export function renderWithI18n(ui: ReactElement, locale: Locale = 'es'): RenderResult {
  localStorage.setItem('mm_locale', locale);
  return render(ui, { wrapper: I18nProvider });
}

/** RegExp that matches `text` literally (translations contain parentheses, dots…). */
export const literal = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
