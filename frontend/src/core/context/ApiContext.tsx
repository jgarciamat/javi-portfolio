import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  accountApi,
  budgetApi,
  categoryApi,
  customAlertApi,
  dataApi,
  goalApi,
  insightsApi,
  monthApi,
  recurringApi,
  settingsApi,
  transactionApi,
} from '@core/api/financeApi';
import { authApi } from '@core/api/authApi';
import { billingApi, offersApi } from '@core/api/billingApi';

// ─── API shape types ─────────────────────────────────────────────────────────

export interface IApiContext {
  authApi: typeof authApi;
  monthApi: typeof monthApi;
  transactionApi: typeof transactionApi;
  categoryApi: typeof categoryApi;
  recurringApi: typeof recurringApi;
  customAlertApi: typeof customAlertApi;
  accountApi: typeof accountApi;
  budgetApi: typeof budgetApi;
  goalApi: typeof goalApi;
  settingsApi: typeof settingsApi;
  insightsApi: typeof insightsApi;
  dataApi: typeof dataApi;
  billingApi: typeof billingApi;
  offersApi: typeof offersApi;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ApiContext = createContext<IApiContext | null>(null);

const defaultValue: IApiContext = {
  authApi,
  monthApi,
  transactionApi,
  categoryApi,
  recurringApi,
  customAlertApi,
  accountApi,
  budgetApi,
  goalApi,
  settingsApi,
  insightsApi,
  dataApi,
  billingApi,
  offersApi,
};

/** Tests (or storybooks) can pass partial fakes through `value`. */
export function ApiProvider({
  children,
  value,
}: {
  children: ReactNode;
  value?: Partial<IApiContext>;
}) {
  const merged = useMemo(() => (value ? { ...defaultValue, ...value } : defaultValue), [value]);
  return <ApiContext.Provider value={merged}>{children}</ApiContext.Provider>;
}

export function useApi(): IApiContext {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used inside ApiProvider');
  return ctx;
}
