import type { SummaryCardsProps } from '../types';
import '../css/SummaryCards.css';
import { formatCurrency } from '../types/SummaryCards.types';
import { useI18n } from '@core/i18n/I18nContext';
import { useSummaryCards } from '../../application/hooks/useSummaryCards';
import { SummaryCardModal } from './SummaryCardModal';
import { useState } from 'react';
import type { SummaryCardDetail } from '../../application/hooks/useSummaryCards';

interface ModalState {
    title: string;
    value: string;
    icon: string;
    accent: string;
    detail: SummaryCardDetail;
}

export function SummaryCards({ summary, carryover }: SummaryCardsProps) {
    const { t } = useI18n();
    const { saldoTotal, carryoverAmount, cards } = useSummaryCards(summary, carryover, t);
    const [modal, setModal] = useState<ModalState | null>(null);

    const carryoverDetail: SummaryCardDetail = {
        formula: t('app.summary.availableBalance.formula'),
        explanation: t('app.summary.availableBalance.explanation'),
        rows: [
            { label: t('app.summary.carryover'), value: formatCurrency(carryoverAmount), accent: '#6366f1' },
            { label: t('app.summary.monthBalance'), value: formatCurrency(summary.balance), accent: summary.balance >= 0 ? '#22c55e' : '#ef4444' },
            { label: t('app.summary.availableBalance'), value: formatCurrency(saldoTotal), accent: saldoTotal >= 0 ? '#6366f1' : '#ef4444' },
        ],
    };

    return (
        <>
            <section aria-label={t('app.summary.ariaLabel')}>
                <div className="summary-grid">
                    {/* Saldo disponible */}
                    <button
                        className="summary-card summary-card-carryover summary-card-clickable"
                        style={{ '--accent': saldoTotal >= 0 ? '#6366f1' : '#ef4444' } as React.CSSProperties}
                        onClick={() => setModal({ title: t('app.summary.availableBalance'), value: formatCurrency(saldoTotal), icon: '🏦', accent: saldoTotal >= 0 ? '#6366f1' : '#ef4444', detail: carryoverDetail })}
                        aria-haspopup="dialog"
                    >
                        <div className="summary-card-header">
                            <span className="summary-card-title">{t('app.summary.availableBalance')}</span>
                            <span className="summary-card-icon" aria-hidden="true">🏦</span>
                        </div>
                        <div className="summary-card-value">{formatCurrency(saldoTotal)}</div>
                        <div className="summary-card-sub">
                            {t('app.summary.carryover')}: {formatCurrency(carryoverAmount)}
                        </div>
                    </button>

                    {cards.map((card) => (
                        <button
                            key={card.title}
                            className="summary-card summary-card-clickable"
                            style={{ '--accent': card.accent } as React.CSSProperties}
                            onClick={() => setModal({ title: card.title, value: card.value, icon: card.icon, accent: card.accent, detail: card.detail })}
                            aria-haspopup="dialog"
                        >
                            <div className="summary-card-header">
                                <span className="summary-card-title">{card.title}</span>
                                <span className="summary-card-icon" aria-hidden="true">{card.icon}</span>
                            </div>
                            <div className="summary-card-value">{card.value}</div>
                            <div className="summary-card-sub">{card.sub}</div>
                        </button>
                    ))}
                </div>
            </section>

            {modal && (
                <SummaryCardModal
                    title={modal.title}
                    value={modal.value}
                    icon={modal.icon}
                    accent={modal.accent}
                    detail={modal.detail}
                    onClose={() => setModal(null)}
                />
            )}
        </>
    );
}
