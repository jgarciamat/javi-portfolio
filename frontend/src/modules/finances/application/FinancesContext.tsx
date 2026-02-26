import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
    type ReactNode,
} from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import type {
    Transaction,
    CreateTransactionDTO,
    Category,
    CreateCategoryDTO,
    FinancialSummary,
} from '@modules/finances/domain/types';

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
    goToPrev: () => void;
    goToNext: () => void;
    navigateTo: (year: number, month: number) => void;
    addTransaction: (dto: CreateTransactionDTO) => Promise<Transaction>;
    removeTransaction: (id: string) => Promise<void>;
    addCategory: (dto: CreateCategoryDTO) => Promise<Category>;
    removeCategory: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
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
    const { token } = useAuth();

    // ── Navigation ────────────────────────────────────────────────────────────
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    const goToPrev = useCallback(() => {
        setYear((y) => (month === 1 ? y - 1 : y));
        setMonth((m) => (m === 1 ? 12 : m - 1));
    }, [month]);

    const goToNext = useCallback(() => {
        setYear((y) => (month === 12 ? y + 1 : y));
        setMonth((m) => (m === 12 ? 1 : m + 1));
    }, [month]);

    const navigateTo = useCallback((targetYear: number, targetMonth: number) => {
        setYear(targetYear);
        setMonth(targetMonth);
    }, []);

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
        async (opts?: { silent?: boolean }) => {
            if (!token) return;
            const key = `${year}-${month}`;
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
                setError(e instanceof Error ? e.message : 'Error al cargar datos');
            } finally {
                setLoading(false);
            }
        },
        [year, month, token, transactionApi, budgetApi, applyMonthData]
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

    // ── Categories state ──────────────────────────────────────────────────────
    const [categories, setCategories] = useState<Category[]>([]);

    const fetchCategories = useCallback(async () => {
        if (!token) return;
        categoryApi
            .getAll()
            .then((cats) =>
                setCategories([...cats].sort((a, b) => a.name.localeCompare(b.name)))
            )
            .catch(() => setCategories([]));
    }, [token, categoryApi]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const addCategory = useCallback(
        async (dto: CreateCategoryDTO) => {
            const cat = await categoryApi.create(dto);
            setCategories((prev) =>
                [...prev, cat].sort((a, b) => a.name.localeCompare(b.name))
            );
            return cat;
        },
        [categoryApi]
    );

    const removeCategory = useCallback(
        async (id: string) => {
            await categoryApi.delete(id);
            setCategories((prev) => prev.filter((c) => c.id !== id));
        },
        [categoryApi]
    );

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
        goToPrev,
        goToNext,
        navigateTo,
        addTransaction,
        removeTransaction,
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
