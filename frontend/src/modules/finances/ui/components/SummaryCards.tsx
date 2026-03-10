import type { SummaryCardsProps } from '../types';
import '../css/SummaryCards.css';
import { formatCurrency } from '../types/SummaryCards.types';
import { useI18n } from '@core/i18n/I18nContext';
import { useSummaryCards } from '../../application/hooks/useSummaryCards';

export function SummaryCards({ summary, carryover }: SummaryCardsProps) {
    const { t } = useI18n();
    const { saldoTotal, carryoverAmount, cards } = useSummaryCards(summary, carryover, t);

    return (
        <section aria-label={t('app.summary.ariaLabel')}>
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
                            <span className="summary-card-icon" aria-hidden="true">{card.icon}</span>
                        </div>
                        <div className="summary-card-value">{card.value}</div>
                        <div className="summary-card-sub">{card.sub}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}
