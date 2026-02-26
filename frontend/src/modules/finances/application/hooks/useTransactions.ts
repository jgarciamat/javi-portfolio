import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import type {
    Transaction,
    CreateTransactionDTO,
    FinancialSummary,
} from '@modules/finances/domain/types';

interface UseTransactionsOptions {
    year: number;
    month: number;
}

interface MonthCache {
    transactions: Transaction[];
    summary: FinancialSummary;
    carryover: number;
}

type Cache = Map<string, MonthCache>;

export function useTransactions({ year, month }: UseTransactionsOptions) {
    const { transactionApi, budgetApi } = useApi();
    const { token } = useAuth();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [carryover, setCarryover] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cache = useRef<Cache>(new Map());

    const applyData = useCallback((data: MonthCache) => {
        setTransactions(data.transactions);
        setSummary(data.summary);
        setCarryover(data.carryover);
    }, []);

    const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
        if (!token) return;
        const key = `${year}-${month}`;
        const cached = cache.current.get(key);

        if (cached && !opts?.silent) {
            applyData(cached);
        }

        if (!cached) setLoading(true);
        setError(null);

        try {
            const [txs, sum, co] = await Promise.all([
                transactionApi.getAll({ year, month }),
                transactionApi.getSummary({ year, month }),
                budgetApi.getCarryover(year, month),
            ]);
            const fresh: MonthCache = { transactions: txs, summary: sum, carryover: co.carryover };
            cache.current.set(key, fresh);
            applyData(fresh);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, [year, month, token, transactionApi, budgetApi, applyData]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const addTransaction = useCallback(
        async (dto: CreateTransactionDTO) => {
            const tx = await transactionApi.create(dto);
            cache.current.delete(`${year}-${month}`);
            await fetchAll({ silent: true });
            return tx;
        },
        [fetchAll, year, month, transactionApi]
    );

    const removeTransaction = useCallback(
        async (id: string) => {
            await transactionApi.delete(id);
            cache.current.delete(`${year}-${month}`);
            await fetchAll({ silent: true });
        },
        [fetchAll, year, month, transactionApi]
    );

    return {
        transactions,
        summary,
        carryover,
        loading,
        error,
        addTransaction,
        removeTransaction,
        refresh: fetchAll,
    };
}
