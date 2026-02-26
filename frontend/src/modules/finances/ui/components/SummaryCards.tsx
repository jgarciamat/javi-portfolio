import type { SummaryCardsProps } from '../types';
import { formatCurrency } from '../types/SummaryCards.types';

export function SummaryCards({ summary, carryover }: SummaryCardsProps) {
    const carryoverAmount = carryover ?? 0;
    const saldoTotal = carryoverAmount + summary.balance;

    const savingsRate = summary.totalIncome > 0 ? (summary.totalSaving / summary.totalIncome) * 100 : 0;
    const savingsRateColor = savingsRate >= 20 ? '#22c55e' : savingsRate >= 10 ? '#f59e0b' : '#ef4444';

    const cards = [
        {
            title: 'Balance del mes',
            value: formatCurrency(summary.balance),
            accent: summary.balance >= 0 ? '#22c55e' : '#ef4444',
            icon: '💰',
            sub: `${summary.transactionCount} transacciones`,
        },
        {
            title: 'Ingresos',
            value: formatCurrency(summary.totalIncome),
            accent: '#22c55e',
            icon: '📈',
            sub: 'Total ingresos',
        },
        {
            title: 'Gastos',
            value: formatCurrency(summary.totalExpenses),
            accent: '#ef4444',
            icon: '📉',
            sub: 'Total gastos',
        },
        {
            title: 'Ahorrado',
            value: formatCurrency(summary.totalSaving),
            accent: '#a78bfa',
            icon: '🐷',
            sub: 'Total ahorrado',
        },
        {
            title: 'Tasa de ahorro',
            value: `${savingsRate.toFixed(1)}%`,
            accent: savingsRateColor,
            icon: '📊',
            sub: summary.totalIncome > 0
                ? `Sobre ${formatCurrency(summary.totalIncome)} ingresado`
                : 'Sin ingresos registrados',
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
                    <span className="summary-card-title">Saldo disponible 🏦</span>
                </div>
                <div className="summary-card-value">{formatCurrency(saldoTotal)}</div>
                <div className="summary-card-sub">
                    Acumulado meses anteriores: {formatCurrency(carryoverAmount)}
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
