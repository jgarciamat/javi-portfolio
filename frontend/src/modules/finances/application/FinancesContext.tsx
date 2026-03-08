import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
    type ReactNode,
} from 'react'; import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import type {
    Transaction,
    CreateTransactionDTO,
    UpdateTransactionDTO,
    Category,
    CreateCategoryDTO,
    FinancialSummary,
} from '@modules/finances/domain/types';
import { useCategoryActions } from './hooks/useCategoryActions';

// ─── State & Actions ──────────────────────────────────────────────────────────

interface FinancesState {
    year: number;
    month: number;
    transactions: Transaction[];
    summary: FinancialSummary | null;
    carryover: number | null;
    categories: Category[];
    loading: boolean;
    error: string | null;
}

interface FinancesActions {
    isPrevDisabled: boolean;
    isNextDisabled: boolean;
    goToPrev: () => void;
    goToNext: () => void;
    navigateTo: (year: number, month: number) => void;
    addTransaction: (dto: CreateTransactionDTO) => Promise<Transaction>;
    removeTransaction: (id: string) => Promise<void>;
    patchTransaction: (id: string, changes: { notes?: string | null }) => Promise<void>;
    updateTransaction: (id: string, dto: UpdateTransactionDTO) => Promise<void>;
    addCategory: (dto: CreateCategoryDTO) => Promise<Category>;
    removeCategory: (id: string) => Promise<void>;
    refresh: (opts?: { invalidate?: boolean }) => Promise<void>;
}

type FinancesContextValue = FinancesState & FinancesActions;

// ─── Context ──────────────────────────────────────────────────────────────────

const FinancesContext = createContext<FinancesContextValue | null>(null);

// ─── Cache types ─────────────────────────────────────────────────────────────

interface MonthCache {
    transactions: Transaction[];
    summary: FinancialSummary;
    carryover: number;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FinancesProvider({ children }: { children: ReactNode }) {
    const { transactionApi, categoryApi, budgetApi } = useApi();
    const { token, logout } = useAuth();

    // ── Navigation ────────────────────────────────────────────────────────────
    // Capture 'now' once on mount — used only for initial state and navigation bounds
    const nowRef = useRef(new Date());
    const now = nowRef.current;
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    const MIN_YEAR = 2026;
    const MIN_MONTH = 1;

    // Maximum allowed: 1 month ahead of today (fixed at mount time)
    const maxYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const maxMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2;

    const isPrevDisabled = year === MIN_YEAR && month === MIN_MONTH;

    const goToPrev = useCallback(() => {
        if (year === MIN_YEAR && month === MIN_MONTH) return;
        setYear((y) => (month === 1 ? y - 1 : y));
        setMonth((m) => (m === 1 ? 12 : m - 1));
    }, [month, year]);

    const goToNext = useCallback(() => {
        // Block if already at the max allowed month (current + 1)
        if (year > maxYear || (year === maxYear && month >= maxMonth)) return;
        setYear((y) => (month === 12 ? y + 1 : y));
        setMonth((m) => (m === 12 ? 1 : m + 1));
    }, [month, year, maxYear, maxMonth]);

    const navigateTo = useCallback((targetYear: number, targetMonth: number) => {
        if (targetYear < MIN_YEAR || (targetYear === MIN_YEAR && targetMonth < MIN_MONTH)) return;
        // Also block navigation beyond max allowed month
        if (targetYear > maxYear || (targetYear === maxYear && targetMonth > maxMonth)) return;
        setYear(targetYear);
        setMonth(targetMonth);
    }, [maxYear, maxMonth]);

    // ── Transactions state ────────────────────────────────────────────────────
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [carryover, setCarryover] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cache = useRef<Map<string, MonthCache>>(new Map());

    const applyMonthData = useCallback((data: MonthCache) => {
        setTransactions(data.transactions);
        setSummary(data.summary);
        setCarryover(data.carryover);
    }, []);

    const fetchMonth = useCallback(
        async (opts?: { silent?: boolean; invalidate?: boolean }) => {
            if (!token) return;
            const key = `${year}-${month}`;

            if (opts?.invalidate) {
                cache.current.delete(key);
            }

            const cached = cache.current.get(key);

            if (cached && !opts?.silent) {
                applyMonthData(cached);
            }
            if (!cached) setLoading(true);
            setError(null);

            try {
                const [txs, sum, co] = await Promise.all([
                    transactionApi.getAll({ year, month }),
                    transactionApi.getSummary({ year, month }),
                    budgetApi.getCarryover(year, month),
                ]);
                const fresh: MonthCache = {
                    transactions: txs,
                    summary: sum,
                    carryover: co.carryover,
                };
                cache.current.set(key, fresh);
                applyMonthData(fresh);
            } catch (e) {
                if (e instanceof Error && e.message.toLowerCase().includes('sesión expirada')) {
                    logout();
                    return;
                }
                setError(e instanceof Error ? e.message : 'Error al cargar datos');
            } finally {
                setLoading(false);
            }
        },
        [year, month, token, logout, transactionApi, budgetApi, applyMonthData]
    );

    useEffect(() => {
        fetchMonth();
    }, [fetchMonth]);

    const addTransaction = useCallback(
        async (dto: CreateTransactionDTO) => {
            const tx = await transactionApi.create(dto);
            cache.current.delete(`${year}-${month}`);
            await fetchMonth({ silent: true });
            return tx;
        },
        [year, month, transactionApi, fetchMonth]
    );

    const removeTransaction = useCallback(
        async (id: string) => {
            await transactionApi.delete(id);
            cache.current.delete(`${year}-${month}`);
            await fetchMonth({ silent: true });
        },
        [year, month, transactionApi, fetchMonth]
    );

    const patchTransaction = useCallback(
        async (id: string, changes: { notes?: string | null }) => {
            const updated = await transactionApi.patch(id, changes);
            const key = `${year}-${month}`;
            const cached = cache.current.get(key);
            if (cached) {
                const newTxs = cached.transactions.map((t) => (t.id === id ? updated : t));
                cache.current.set(key, { ...cached, transactions: newTxs });
                setTransactions(newTxs);
            }
        },
        [year, month, transactionApi]
    );

    const updateTransaction = useCallback(
        async (id: string, dto: UpdateTransactionDTO) => {
            const updated = await transactionApi.update(id, dto);
            cache.current.delete(`${year}-${month}`);
            await fetchMonth({ silent: true });
            // Optimistically update state too
            setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
        },
        [year, month, transactionApi, fetchMonth]
    );

    // ── Categories ────────────────────────────────────────────────────────────
    const { categories, addCategory, removeCategory } = useCategoryActions(categoryApi);

    // ── Value ─────────────────────────────────────────────────────────────────
    const value: FinancesContextValue = {
        year,
        month,
        transactions,
        summary,
        carryover,
        categories,
        loading,
        error,
        isPrevDisabled,
        isNextDisabled: year > maxYear || (year === maxYear && month >= maxMonth),
        goToPrev,
        goToNext,
        navigateTo,
        addTransaction,
        removeTransaction,
        patchTransaction,
        updateTransaction,
        addCategory,
        removeCategory,
        refresh: fetchMonth,
    };

    return (
        <FinancesContext.Provider value={value}>
            {children}
        </FinancesContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFinances(): FinancesContextValue {
    const ctx = useContext(FinancesContext);
    if (!ctx) throw new Error('useFinances must be used within a FinancesProvider');
    return ctx;
}
