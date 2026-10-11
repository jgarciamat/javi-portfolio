import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  accountApi,
  assetApi,
  budgetApi,
  businessApi,
  categoryApi,
  categoryRuleApi,
  customAlertApi,
  dataApi,
  goalApi,
  insightsApi,
  monthApi,
  pushApi,
  ratesApi,
  recurringApi,
  settingsApi,
  splitApi,
  transactionApi,
} from '@core/api/financeApi';
import { authApi } from '@core/api/authApi';
import { billingApi, householdApi, offersApi } from '@core/api/billingApi';

// ─── API shape types ─────────────────────────────────────────────────────────

export interface IApiContext {
  authApi: typeof authApi;
  monthApi: typeof monthApi;
  transactionApi: typeof transactionApi;
  categoryApi: typeof categoryApi;
  categoryRuleApi: typeof categoryRuleApi;
  recurringApi: typeof recurringApi;
  customAlertApi: typeof customAlertApi;
  accountApi: typeof accountApi;
  assetApi: typeof assetApi;
  businessApi: typeof businessApi;
  splitApi: typeof splitApi;
  pushApi: typeof pushApi;
  ratesApi: typeof ratesApi;
  budgetApi: typeof budgetApi;
  goalApi: typeof goalApi;
  settingsApi: typeof settingsApi;
  insightsApi: typeof insightsApi;
  dataApi: typeof dataApi;
  billingApi: typeof billingApi;
  offersApi: typeof offersApi;
  householdApi: typeof householdApi;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ApiContext = createContext<IApiContext | null>(null);

const defaultValue: IApiContext = {
  authApi,
  monthApi,
  transactionApi,
  categoryApi,
  categoryRuleApi,
  recurringApi,
  customAlertApi,
  accountApi,
  assetApi,
  businessApi,
  splitApi,
  pushApi,
  ratesApi,
  budgetApi,
  goalApi,
  settingsApi,
  insightsApi,
  dataApi,
  billingApi,
  offersApi,
  householdApi,
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
