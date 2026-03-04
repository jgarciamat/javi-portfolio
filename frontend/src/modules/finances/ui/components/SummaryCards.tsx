import type { SummaryCardsProps } from '../types';
import '../css/SummaryCards.css';
import { formatCurrency } from '../types/SummaryCards.types';
import { useI18n } from '@core/i18n/I18nContext';

export function SummaryCards({ summary, carryover }: SummaryCardsProps) {
    const { t } = useI18n();
    const carryoverAmount = carryover ?? 0;
    const saldoTotal = carryoverAmount + summary.balance;

    const savingsRate = summary.totalIncome > 0 ? (summary.totalSaving / summary.totalIncome) * 100 : 0;
    const savingsRateColor = savingsRate >= 20 ? '#22c55e' : savingsRate >= 10 ? '#f59e0b' : '#ef4444';

    const cards = [
        {
            title: t('app.summary.monthBalance'),
            value: formatCurrency(summary.balance),
            accent: summary.balance >= 0 ? '#22c55e' : '#ef4444',
            icon: '💰',
            sub: t('app.summary.monthBalance.sub', { count: String(summary.transactionCount) }),
        },
        {
            title: t('app.summary.income'),
            value: formatCurrency(summary.totalIncome),
            accent: '#22c55e',
            icon: '📈',
            sub: t('app.summary.income.sub'),
        },
        {
            title: t('app.summary.expenses'),
            value: formatCurrency(summary.totalExpenses),
            accent: '#ef4444',
            icon: '📉',
            sub: t('app.summary.expenses.sub'),
        },
        {
            title: t('app.summary.saving'),
            value: formatCurrency(summary.totalSaving),
            accent: '#a78bfa',
            icon: '🐷',
            sub: t('app.summary.saving.sub'),
        },
        {
            title: t('app.summary.savingsRate'),
            value: `${savingsRate.toFixed(1)}%`,
            accent: savingsRateColor,
            icon: '📊',
            sub: summary.totalIncome > 0
                ? t('app.summary.savingsRate.sub', { amount: formatCurrency(summary.totalIncome) })
                : t('app.summary.savingsRate.noIncome'),
        },
    ];

    return (
        <>
            {/* Saldo disponible */}
            <div
                className="summary-card summary-card-carryover"
                style={{ '--accent': saldoTotal >= 0 ? '#6366f1' : '#ef4444' } as React.CSSProperties}
            >
                <div className="summary-card-header">
                    <span className="summary-card-title">{t('app.summary.availableBalance')} 🏦</span>
                </div>
                <div className="summary-card-value">{formatCurrency(saldoTotal)}</div>
                <div className="summary-card-sub">
                    {t('app.summary.carryover')}: {formatCurrency(carryoverAmount)}
                </div>
            </div>

            <div className="summary-grid">
                {cards.map((card) => (
                    <div key={card.title} className="summary-card" style={{ '--accent': card.accent } as React.CSSProperties}>
                        <div className="summary-card-header">
                            <span className="summary-card-title">{card.title}</span>
                            <span className="summary-card-icon">{card.icon}</span>
                        </div>
                        <div className="summary-card-value">{card.value}</div>
                        <div className="summary-card-sub">{card.sub}</div>
                    </div>
                ))}
            </div>
        </>
    );
}
