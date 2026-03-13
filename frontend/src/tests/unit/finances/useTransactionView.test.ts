import { renderHook, act } from '@testing-library/react';
import {
    useTransactionView,
    type TransactionViewMode,
} from '@modules/finances/application/hooks/useTransactionView';
import type { Transaction } from '@modules/finances/domain/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTx(id: string, date: string, amount: number, type: Transaction['type']): Transaction {
    return {
        id,
        date,
        amount,
        type,
        description: 'Test',
        categoryId: null,
        categoryName: null,
        categoryColor: null,
        categoryIcon: null,
        notes: null,
        userId: 'u1',
    };
}

const TXNS: Transaction[] = [
    makeTx('1', '2026-03-06T10:00:00Z', 100, 'INCOME'),
    makeTx('2', '2026-03-06T15:00:00Z', 50, 'EXPENSE'),
    makeTx('3', '2026-03-07T09:00:00Z', 200, 'EXPENSE'),
    makeTx('4', '2026-03-10T12:00:00Z', 300, 'INCOME'),
];

const DEFAULT_OPTS = {
    transactions: TXNS,
    locale: 'es-ES',
    year: 2026,
    month: 3,
};

// ─── Initial state ────────────────────────────────────────────────────────────

describe('useTransactionView — initial state', () => {
    test('default mode is "day"', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        expect(result.current.mode).toBe('day');
    });

    test('dayGroups is an array', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        expect(Array.isArray(result.current.dayGroups)).toBe(true);
    });

    test('weekGroups is an array', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        expect(Array.isArray(result.current.weekGroups)).toBe(true);
    });

    test('calendarRows is a 6×7 matrix', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        expect(result.current.calendarRows).toHaveLength(6);
        result.current.calendarRows.forEach(row => expect(row).toHaveLength(7));
    });
});

// ─── setMode ─────────────────────────────────────────────────────────────────

describe('useTransactionView — setMode', () => {
    test.each<TransactionViewMode>(['day', 'week', 'calendar'])(
        'setMode("%s") updates mode correctly',
        (newMode) => {
            const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
            act(() => result.current.setMode(newMode));
            expect(result.current.mode).toBe(newMode);
        },
    );

    test('mode can be toggled back to "day"', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        act(() => result.current.setMode('calendar'));
        act(() => result.current.setMode('day'));
        expect(result.current.mode).toBe('day');
    });
});

// ─── dayGroups ────────────────────────────────────────────────────────────────

describe('useTransactionView — dayGroups', () => {
    test('groups 4 transactions into 3 days', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        expect(result.current.dayGroups).toHaveLength(3);
    });

    test('day groups have correct dayKeys', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        const keys = result.current.dayGroups.map(g => g.dayKey);
        expect(keys).toContain('2026-03-06');
        expect(keys).toContain('2026-03-07');
        expect(keys).toContain('2026-03-10');
    });

    test('day with 2 transactions has 2 items', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        const march6 = result.current.dayGroups.find(g => g.dayKey === '2026-03-06');
        expect(march6?.items).toHaveLength(2);
    });

    test('returns empty array for no transactions', () => {
        const { result } = renderHook(() => useTransactionView({ ...DEFAULT_OPTS, transactions: [] }));
        expect(result.current.dayGroups).toEqual([]);
    });

    test('recalculates when transactions change', () => {
        let txns = TXNS;
        const { result, rerender } = renderHook(() => useTransactionView({ ...DEFAULT_OPTS, transactions: txns }));
        expect(result.current.dayGroups).toHaveLength(3);

        txns = [TXNS[0]];
        rerender();
        expect(result.current.dayGroups).toHaveLength(1);
    });
});

// ─── weekGroups ───────────────────────────────────────────────────────────────

describe('useTransactionView — weekGroups', () => {
    test('groups transactions into ISO weeks', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        // Mar 6+7 → W10, Mar 10 → W11
        expect(result.current.weekGroups).toHaveLength(2);
    });

    test('week totals are computed', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        const w10 = result.current.weekGroups.find(w => w.weekKey === '2026-W10');
        expect(w10?.totals.income).toBe(100);
        expect(w10?.totals.expenses).toBe(250);
        expect(w10?.totals.balance).toBe(-150);
    });

    test('returns empty array for no transactions', () => {
        const { result } = renderHook(() => useTransactionView({ ...DEFAULT_OPTS, transactions: [] }));
        expect(result.current.weekGroups).toEqual([]);
    });
});

// ─── calendarRows ─────────────────────────────────────────────────────────────

describe('useTransactionView — calendarRows', () => {
    test('always 42 cells for March 2026', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        expect(result.current.calendarRows.flat()).toHaveLength(42);
    });

    test('transactions appear in the correct calendar cell', () => {
        const { result } = renderHook(() => useTransactionView(DEFAULT_OPTS));
        const cell6 = result.current.calendarRows.flat().find(c => c.dayKey === '2026-03-06');
        expect(cell6?.items).toHaveLength(2);
    });

    test('recalculates when year/month change', () => {
        let year = 2026;
        let month = 3;
        const { result, rerender } = renderHook(() =>
            useTransactionView({ ...DEFAULT_OPTS, year, month }),
        );
        const marchDays = result.current.calendarRows.flat().filter(c => c.dayKey !== null);
        expect(marchDays).toHaveLength(31);

        year = 2026;
        month = 2;
        rerender();
        const febDays = result.current.calendarRows.flat().filter(c => c.dayKey !== null);
        expect(febDays).toHaveLength(28);
    });
});
