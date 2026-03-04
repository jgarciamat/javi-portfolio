import { renderHook } from '@testing-library/react';
import { useBudgetAlerts } from '@modules/finances/application/hooks/useAlerts';
import type { FinancialSummary } from '@modules/finances/domain/types';

const baseSummary: FinancialSummary = {
    balance: 0,
    totalIncome: 400,
    totalExpenses: 0,
    totalSaving: 0,
    transactionCount: 0,
    expensesByCategory: {},
    incomeByCategory: {},
    savingByCategory: {},
};

describe('useBudgetAlerts', () => {
    test('returns empty array when summary is null', () => {
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary: null, carryover: null })
        );
        expect(result.current).toEqual([]);
    });

    test('returns empty array when available <= 0 (no income, no carryover)', () => {
        const noIncome: FinancialSummary = { ...baseSummary, totalIncome: 0, totalExpenses: 0 };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary: noIncome, carryover: 0 })
        );
        expect(result.current).toEqual([]);
    });

    test('returns empty array when expenses are below 80% of available', () => {
        // 400 income, 300 expenses → 75% — no alert
        const summary: FinancialSummary = { ...baseSummary, totalExpenses: 300 };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary, carryover: 0 })
        );
        const global = result.current.filter(a => a.category === null);
        expect(global).toHaveLength(0);
    });

    test('returns warning alert at >= 80% spent', () => {
        // 400 income, 320 expenses → 80%
        const summary: FinancialSummary = { ...baseSummary, totalExpenses: 320 };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary, carryover: 0 })
        );
        const global = result.current.find(a => a.category === null);
        expect(global).toBeDefined();
        expect(global!.level).toBe('warning');
        expect(global!.percentage).toBe(80);
    });

    test('returns danger alert at >= 100% spent', () => {
        // 400 income, 400 expenses → 100%
        const summary: FinancialSummary = { ...baseSummary, totalExpenses: 400 };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary, carryover: 0 })
        );
        const global = result.current.find(a => a.category === null);
        expect(global).toBeDefined();
        expect(global!.level).toBe('danger');
        expect(global!.percentage).toBe(100);
    });

    test('remainingAmount is available minus totalExpenses', () => {
        // 400 income, 380 expenses → remaining = 20
        const summary: FinancialSummary = { ...baseSummary, totalExpenses: 380 };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary, carryover: 0 })
        );
        const global = result.current.find(a => a.category === null);
        expect(global).toBeDefined();
        expect(global!.remainingAmount).toBe(20);
    });

    test('remainingAmount is negative when expenses exceed available', () => {
        // 400 income, 450 expenses → remaining = -50
        const summary: FinancialSummary = { ...baseSummary, totalExpenses: 450 };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary, carryover: 0 })
        );
        const global = result.current.find(a => a.category === null);
        expect(global).toBeDefined();
        expect(global!.remainingAmount).toBe(-50);
    });

    test('carryover is added to available budget', () => {
        // 200 carryover + 200 income = 400 available; 380 expenses → 95%
        const summary: FinancialSummary = { ...baseSummary, totalIncome: 200, totalExpenses: 380 };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary, carryover: 200 })
        );
        const global = result.current.find(a => a.category === null);
        expect(global).toBeDefined();
        expect(global!.percentage).toBe(95);
        expect(global!.remainingAmount).toBe(20);
    });

    test('null carryover is treated as 0', () => {
        // same as carryover: 0
        const summary: FinancialSummary = { ...baseSummary, totalExpenses: 320 };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary, carryover: null })
        );
        const global = result.current.find(a => a.category === null);
        expect(global).toBeDefined();
        expect(global!.level).toBe('warning');
    });

    test('triggers category warning when category >= 30% of available', () => {
        // 400 available, category spent 120 → 30%
        const summary: FinancialSummary = {
            ...baseSummary,
            expensesByCategory: { Comida: 120 },
        };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary, carryover: 0 })
        );
        const catAlert = result.current.find(a => a.category === 'Comida');
        expect(catAlert).toBeDefined();
        expect(catAlert!.level).toBe('warning');
        expect(catAlert!.spentAmount).toBe(120);
        expect(catAlert!.remainingAmount).toBeNull();
    });

    test('triggers category danger when category >= 40% of available', () => {
        // 400 available, category spent 160 → 40%
        const summary: FinancialSummary = {
            ...baseSummary,
            expensesByCategory: { Comida: 160 },
        };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary, carryover: 0 })
        );
        const catAlert = result.current.find(a => a.category === 'Comida');
        expect(catAlert).toBeDefined();
        expect(catAlert!.level).toBe('danger');
    });

    test('no category alert when category < 30% of available', () => {
        // 400 available, category spent 100 → 25%
        const summary: FinancialSummary = {
            ...baseSummary,
            expensesByCategory: { Comida: 100 },
        };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary, carryover: 0 })
        );
        const catAlert = result.current.find(a => a.category === 'Comida');
        expect(catAlert).toBeUndefined();
    });

    test('warning message includes percentage', () => {
        // 400 income, 380 expenses → 95%
        const summary: FinancialSummary = { ...baseSummary, totalExpenses: 380 };
        const { result } = renderHook(() =>
            useBudgetAlerts({ summary, carryover: 0 })
        );
        const global = result.current.find(a => a.category === null);
        expect(global!.message).toContain('95%');
        expect(global!.message).not.toContain('20.00€');
    });
});
