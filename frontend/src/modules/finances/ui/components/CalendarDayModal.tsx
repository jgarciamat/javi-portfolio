import '../css/TransactionViews.css';
import { useI18n } from '@core/i18n/I18nContext';
import { txBadgeClass, txAmountColor, formatCurrency } from '../types/TransactionTable.types';
import type { Transaction } from '@modules/finances/domain/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarDayModalProps {
    dayKey: string;                 // "YYYY-MM-DD"
    items: Transaction[];
    onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTotals(items: Transaction[]) {
    return items.reduce(
        (acc, tx) => {
            if (tx.type === 'INCOME') acc.income += tx.amount;
            if (tx.type === 'EXPENSE') acc.expenses += tx.amount;
            if (tx.type === 'SAVING') acc.saving += tx.amount;
            return acc;
        },
        { income: 0, expenses: 0, saving: 0 },
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarDayModal({ dayKey, items, onClose }: CalendarDayModalProps) {
    const { t, locale } = useI18n();

    const fmt = (n: number) => formatCurrency(Math.abs(n), locale);

    const dateLabel = new Intl.DateTimeFormat(locale, {
        weekday: 'long', day: 'numeric', month: 'long',
        timeZone: 'Europe/Madrid',
    }).format(new Date(`${dayKey}T12:00:00`));

    const totals = computeTotals(items);
    const balance = totals.income - totals.expenses - totals.saving;

    return (
        /* Overlay — click outside closes */
        <div
            className="cal-modal-overlay"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={dateLabel}
        >
            <div
                className="cal-modal"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="cal-modal-header">
                    <span className="cal-modal-title">{dateLabel}</span>
                    <button
                        className="cal-modal-close"
                        onClick={onClose}
                        aria-label={t('app.transactions.calendar.popup.close')}
                    >
                        ✕
                    </button>
                </div>

                {/* Summary totals */}
                <div className="cal-modal-summary">
                    {totals.income > 0 && (
                        <div className="cal-modal-summary-row">
                            <span className="cal-modal-summary-label">{t('app.transactions.calendar.popup.income')}</span>
                            <span className="cal-modal-summary-amount" style={{ color: txAmountColor('INCOME') }}>
                                +{fmt(totals.income)}
                            </span>
                        </div>
                    )}
                    {totals.expenses > 0 && (
                        <div className="cal-modal-summary-row">
                            <span className="cal-modal-summary-label">{t('app.transactions.calendar.popup.expenses')}</span>
                            <span className="cal-modal-summary-amount" style={{ color: txAmountColor('EXPENSE') }}>
                                −{fmt(totals.expenses)}
                            </span>
                        </div>
                    )}
                    {totals.saving > 0 && (
                        <div className="cal-modal-summary-row">
                            <span className="cal-modal-summary-label">{t('app.transactions.calendar.popup.saving')}</span>
                            <span className="cal-modal-summary-amount" style={{ color: txAmountColor('SAVING') }}>
                                {fmt(totals.saving)}
                            </span>
                        </div>
                    )}
                    <div className="cal-modal-summary-row cal-modal-summary-row--balance">
                        <span className="cal-modal-summary-label">{t('app.transactions.calendar.popup.balance')}</span>
                        <span
                            className="cal-modal-summary-amount cal-modal-summary-amount--balance"
                            style={{ color: txAmountColor(balance >= 0 ? 'INCOME' : 'EXPENSE') }}
                        >
                            {balance >= 0 ? '+' : '−'}{fmt(balance)}
                        </span>
                    </div>
                </div>

                {/* Transaction list */}
                <div className="cal-modal-list">
                    {items.map((tx) => (
                        <div key={tx.id} className={`cal-modal-item cal-modal-item--${tx.type.toLowerCase()}`}>
                            <div className="cal-modal-item-accent" />
                            <div className="cal-modal-item-body">
                                <span className="cal-modal-item-desc">{tx.description}</span>
                                {tx.category && (
                                    <span className="cal-modal-item-cat">{tx.category}</span>
                                )}
                            </div>
                            <div className="cal-modal-item-right">
                                <span className={`tx-badge ${txBadgeClass(tx.type)}`}>
                                    {tx.type === 'INCOME'
                                        ? t('app.transaction.form.type.income')
                                        : tx.type === 'SAVING'
                                            ? t('app.transaction.form.type.saving')
                                            : t('app.transaction.form.type.expense')}
                                </span>
                                <span
                                    className="cal-modal-item-amount"
                                    style={{ color: txAmountColor(tx.type) }}
                                >
                                    {tx.type === 'EXPENSE' ? '−' : '+'}{fmt(tx.amount)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
