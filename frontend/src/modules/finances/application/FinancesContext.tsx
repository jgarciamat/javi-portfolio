import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { useResource } from '@shared/hooks/useResource';
import type {
  Account,
  BudgetLine,
  Category,
  CreateCategoryDTO,
  CreateTransactionDTO,
  FinancialSummary,
  MonthAlert,
  MonthOverview,
  Transaction,
  UpdateTransactionDTO,
} from '@modules/finances/domain/types';
import type { YearMonth } from '@modules/finances/domain/nextMonthLogic';
import { useMonthNavigation } from './hooks/useMonthNavigation';
import { useMonthData } from './hooks/useMonthData';
import { useCategoryActions } from './hooks/useCategoryActions';
import { CustomAlertsProvider } from './CustomAlertsContext';

// ─── State & Actions ──────────────────────────────────────────────────────────

interface FinancesState {
  year: number;
  month: number;
  /** Period of today (depends on the user's month start day). */
  currentPeriod: YearMonth;
  /** First / last day of the viewed period (YYYY-MM-DD). */
  periodStart: string | null;
  periodEnd: string | null;
  isCurrentPeriod: boolean;
  transactions: Transaction[];
  summary: FinancialSummary | null;
  carryover: number | null;
  available: number;
  budgets: BudgetLine[];
  alerts: MonthAlert[];
  categories: Category[];
  accounts: Account[];
  loading: boolean;
  error: string | null;
}

interface FinancesActions {
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  goToPrev: () => void;
  goToNext: () => void;
  goToCurrent: () => void;
  navigateTo: (year: number, month: number) => void;
  addTransaction: (dto: CreateTransactionDTO) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
  patchTransaction: (id: string, changes: { notes?: string | null }) => Promise<void>;
  updateTransaction: (id: string, dto: UpdateTransactionDTO) => Promise<void>;
  addCategory: (dto: CreateCategoryDTO) => Promise<Category>;
  updateCategory: (id: string, dto: Partial<CreateCategoryDTO>) => Promise<Category>;
  removeCategory: (id: string, reassignTo?: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
  /** Re-fetches the viewed month; `invalidate` drops every cached month first. */
  refresh: (opts?: { invalidate?: boolean }) => Promise<void>;
}

export type FinancesContextValue = FinancesState & FinancesActions;

const FinancesContext = createContext<FinancesContextValue | null>(null);

const EMPTY: never[] = [];

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FinancesProvider({ children }: { children: ReactNode }) {
  const { monthApi, transactionApi, categoryApi, accountApi } = useApi();
  const { token } = useAuth();
  const settings = useOptionalSettings()?.settings ?? null;
  const nav = useMonthNavigation(settings);
  const { year, month } = nav;
  const { overview, setOverview, loading, error, fetchMonth, forget } = useMonthData(
    monthApi,
    year,
    month,
    !!token
  );
  const accounts = useResource(() => accountApi.getAll().then((r) => r.accounts), [accountApi], {
    enabled: !!token,
    initial: [] as Account[],
  });
  const refreshAccounts = accounts.reload;

  /**
   * Any change can affect other months (a movement dated in another month, the
   * carry-over of every later month…), so every cached month is dropped.
   */
  const afterMutation = useCallback(async () => {
    await Promise.all([fetchMonth({ invalidate: true }), refreshAccounts()]);
  }, [fetchMonth, refreshAccounts]);

  const addTransaction = useCallback(
    async (dto: CreateTransactionDTO) => {
      const tx = await transactionApi.create(dto);
      await afterMutation();
      return tx;
    },
    [transactionApi, afterMutation]
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      await transactionApi.delete(id);
      await afterMutation();
    },
    [transactionApi, afterMutation]
  );

  /** Notes do not change any figure: patch the movement in place. */
  const patchTransaction = useCallback(
    async (id: string, changes: { notes?: string | null }) => {
      const updated = await transactionApi.patch(id, changes);
      // Only movements on screen can be edited, so the month is loaded.
      setOverview((o) => ({
        ...(o as MonthOverview),
        transactions: (o as MonthOverview).transactions.map((t) => (t.id === id ? updated : t)),
      }));
      forget(year, month);
    },
    [transactionApi, setOverview, forget, year, month]
  );

  const updateTransaction = useCallback(
    async (id: string, dto: UpdateTransactionDTO) => {
      await transactionApi.update(id, dto);
      await afterMutation();
    },
    [transactionApi, afterMutation]
  );

  // ── Categories ────────────────────────────────────────────────────────────
  const {
    categories,
    addCategory,
    updateCategory: renameCategory,
    removeCategory: dropCategory,
  } = useCategoryActions(categoryApi);

  const updateCategory = useCallback(
    async (id: string, dto: Partial<CreateCategoryDTO>) => {
      const cat = await renameCategory(id, dto);
      await afterMutation();
      return cat;
    },
    [renameCategory, afterMutation]
  );

  const removeCategory = useCallback(
    async (id: string, reassignTo?: string) => {
      await dropCategory(id, reassignTo);
      if (reassignTo) await afterMutation();
    },
    [dropCategory, afterMutation]
  );

  const value = useMemo<FinancesContextValue>(
    () => ({
      ...nav,
      periodStart: overview?.start ?? null,
      periodEnd: overview?.end ?? null,
      transactions: overview?.transactions ?? EMPTY,
      summary: overview?.summary ?? null,
      carryover: overview?.carryover ?? null,
      available: overview?.available ?? 0,
      budgets: overview?.budgets ?? EMPTY,
      alerts: overview?.alerts ?? EMPTY,
      categories,
      accounts: accounts.data,
      loading,
      error,
      addTransaction,
      removeTransaction,
      patchTransaction,
      updateTransaction,
      addCategory,
      updateCategory,
      removeCategory,
      refreshAccounts,
      refresh: fetchMonth,
    }),
    [
      nav,
      overview,
      categories,
      accounts.data,
      loading,
      error,
      addTransaction,
      removeTransaction,
      patchTransaction,
      updateTransaction,
      addCategory,
      updateCategory,
      removeCategory,
      refreshAccounts,
      fetchMonth,
    ]
  );

  return (
    <FinancesContext.Provider value={value}>
      <CustomAlertsProvider>{children}</CustomAlertsProvider>
    </FinancesContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFinances(): FinancesContextValue {
  const ctx = useContext(FinancesContext);
  if (!ctx) throw new Error('useFinances must be used within a FinancesProvider');
  return ctx;
}
