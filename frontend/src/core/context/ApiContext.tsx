import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { transactionApi, categoryApi } from '@core/api/financeApi';
import { authApi, budgetApi } from '@core/api/authApi';

// ─── API shape types ─────────────────────────────────────────────────────────

export interface IApiContext {
    transactionApi: typeof transactionApi;
    categoryApi: typeof categoryApi;
    authApi: typeof authApi;
    budgetApi: typeof budgetApi;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ApiContext = createContext<IApiContext | null>(null);

const defaultValue: IApiContext = { transactionApi, categoryApi, authApi, budgetApi };

export function ApiProvider({ children }: { children: ReactNode }) {
    return (
        <ApiContext.Provider value={defaultValue}>
            {children}
        </ApiContext.Provider>
    );
}

export function useApi(): IApiContext {
    const ctx = useContext(ApiContext);
    if (!ctx) throw new Error('useApi must be used inside ApiProvider');
    return ctx;
}
