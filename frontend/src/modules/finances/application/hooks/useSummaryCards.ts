import { formatCurrency } from '../../ui/types/SummaryCards.types';
import type { FinancialSummary } from '@modules/finances/domain/types';

export interface SummaryCardDetail {
    formula: string;
    explanation: string;
    rows: { label: string; value: string; accent?: string }[];
}

export interface SummaryCard {
    title: string;
    value: string;
    accent: string;
    icon: string;
    sub: string;
    detail: SummaryCardDetail;
}

export interface UseSummaryCardsReturn {
    saldoTotal: number;
    carryoverAmount: number;
    savingsRate: number;
    savingsRateColor: string;
    cards: SummaryCard[];
}

export function useSummaryCards(
    summary: FinancialSummary,
    carryover: number | null,
    t: (key: string, params?: Record<string, string>) => string,
): UseSummaryCardsReturn {
    const carryoverAmount = carryover ?? 0;
    const saldoTotal = carryoverAmount + summary.balance;

    const savingsRate = summary.totalIncome > 0
        ? (summary.totalSaving / summary.totalIncome) * 100
        : 0;

    const savingsRateColor =
        savingsRate >= 20 ? '#22c55e' :
            savingsRate >= 10 ? '#f59e0b' :
                '#ef4444';

    const cards: SummaryCard[] = [
        {
            title: t('app.summary.monthBalance'),
            value: formatCurrency(summary.balance),
            accent: summary.balance >= 0 ? '#22c55e' : '#ef4444',
            icon: '💰',
            sub: t('app.summary.monthBalance.sub', { count: String(summary.transactionCount) }),
            detail: {
                formula: t('app.summary.monthBalance.formula'),
                explanation: t('app.summary.monthBalance.explanation'),
                rows: [
                    { label: t('app.summary.income'), value: formatCurrency(summary.totalIncome), accent: '#22c55e' },
                    { label: t('app.summary.expenses'), value: `−${formatCurrency(summary.totalExpenses)}`, accent: '#ef4444' },
                    { label: t('app.summary.saving'), value: `−${formatCurrency(summary.totalSaving)}`, accent: '#a78bfa' },
                    { label: t('app.summary.monthBalance'), value: formatCurrency(summary.balance), accent: summary.balance >= 0 ? '#22c55e' : '#ef4444' },
                ],
            },
        },
        {
            title: t('app.summary.income'),
            value: formatCurrency(summary.totalIncome),
            accent: '#22c55e',
            icon: '📈',
            sub: t('app.summary.income.sub'),
            detail: {
                formula: t('app.summary.income.formula'),
                explanation: t('app.summary.income.explanation'),
                rows: [
                    { label: t('app.summary.income'), value: formatCurrency(summary.totalIncome), accent: '#22c55e' },
                ],
            },
        },
        {
            title: t('app.summary.expenses'),
            value: formatCurrency(summary.totalExpenses),
            accent: '#ef4444',
            icon: '📉',
            sub: t('app.summary.expenses.sub'),
            detail: {
                formula: t('app.summary.expenses.formula'),
                explanation: t('app.summary.expenses.explanation'),
                rows: [
                    { label: t('app.summary.expenses'), value: formatCurrency(summary.totalExpenses), accent: '#ef4444' },
                ],
            },
        },
        {
            title: t('app.summary.saving'),
            value: formatCurrency(summary.totalSaving),
            accent: '#a78bfa',
            icon: '🐷',
            sub: t('app.summary.saving.sub'),
            detail: {
                formula: t('app.summary.saving.formula'),
                explanation: t('app.summary.saving.explanation'),
                rows: [
                    { label: t('app.summary.saving'), value: formatCurrency(summary.totalSaving), accent: '#a78bfa' },
                ],
            },
        },
        {
            title: t('app.summary.savingsRate'),
            value: `${savingsRate.toFixed(1)}%`,
            accent: savingsRateColor,
            icon: '📊',
            sub: summary.totalIncome > 0
                ? t('app.summary.savingsRate.sub', { amount: formatCurrency(summary.totalIncome) })
                : t('app.summary.savingsRate.noIncome'),
            detail: {
                formula: t('app.summary.savingsRate.formula'),
                explanation: summary.totalIncome > 0
                    ? t('app.summary.savingsRate.explanation', {
                        saving: formatCurrency(summary.totalSaving),
                        income: formatCurrency(summary.totalIncome),
                        rate: savingsRate.toFixed(1),
                    })
                    : t('app.summary.savingsRate.noIncome'),
                rows: [
                    { label: t('app.summary.saving'), value: formatCurrency(summary.totalSaving), accent: '#a78bfa' },
                    { label: t('app.summary.income'), value: formatCurrency(summary.totalIncome), accent: '#22c55e' },
                    { label: t('app.summary.savingsRate'), value: `${savingsRate.toFixed(1)}%`, accent: savingsRateColor },
                ],
            },
        },
    ];

    return { saldoTotal, carryoverAmount, savingsRate, savingsRateColor, cards };
}
