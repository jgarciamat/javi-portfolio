import { useState, useEffect } from 'react';
import type { CreateTransactionDTO, TransactionType } from '@modules/finances/domain/types';

interface UseTransactionFormOptions {
    viewYear: number;
    viewMonth: number;
    availableBalance: number;
    onSubmit: (dto: CreateTransactionDTO) => Promise<void>;
}

function getDefaultDate(viewYear: number, viewMonth: number): string {
    const now = new Date();
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;
    if (isCurrentMonth) return now.toISOString().split('T')[0];
    return `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`;
}

export function useTransactionForm({
    viewYear,
    viewMonth,
    availableBalance,
    onSubmit,
}: UseTransactionFormOptions) {
    const defaultDate = getDefaultDate(viewYear, viewMonth);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<TransactionType>('EXPENSE');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(defaultDate);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset all fields when the viewed month changes
    useEffect(() => {
        setDescription('');
        setAmount('');
        setType('EXPENSE');
        setCategory('');
        setDate(getDefaultDate(viewYear, viewMonth));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewYear, viewMonth]);

    // Clear error whenever any field changes
    useEffect(() => {
        setError(null);
    }, [description, amount, type, category, date, viewYear, viewMonth]);

    const handleCategoryChange = (value: string, onManageCategories: () => void) => {
        if (value === '__manage__') {
            onManageCategories();
        } else {
            setCategory(value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !category) {
            setError('Rellena todos los campos');
            return;
        }
        const parsedAmount = parseFloat(amount);
        if ((type === 'EXPENSE' || type === 'SAVING') && parsedAmount > availableBalance) {
            const fmt = (n: number) =>
                new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
            setError(`Saldo insuficiente. Saldo disponible: ${fmt(availableBalance)}`);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await onSubmit({
                description,
                amount: parsedAmount,
                type,
                category,
                date: new Date(date).toISOString(),
            });
            setDescription('');
            setAmount('');
            setCategory('');
            setDate(getDefaultDate(viewYear, viewMonth));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear la transacción');
        } finally {
            setLoading(false);
        }
    };

    return {
        fields: { description, amount, type, category, date },
        setDescription,
        setAmount,
        setType,
        setCategory,
        setDate,
        handleCategoryChange,
        handleSubmit,
        loading,
        error,
    };
}

export type UseTransactionFormReturn = ReturnType<typeof useTransactionForm>;
