import { useState } from 'react';
import '../css/TransactionViews.css';
import { useI18n } from '@core/i18n/I18nContext';
import { txBadgeClass, txAmountColor, formatCurrency } from '../types/TransactionTable.types';
import type { WeekGroup } from '@modules/finances/domain/transactionGrouping';

interface Props {
    weekGroups: WeekGroup[];
}

export function TransactionWeekView({ weekGroups }: Props) {
    const { t, locale } = useI18n();

    // All weeks collapsed by default
    const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(
        () => new Set(weekGroups.map((w) => w.weekKey)),
    );

    const toggleWeek = (weekKey: string) => {
        setCollapsedWeeks((prev) => {
            const next = new Set(prev);
            if (next.has(weekKey)) next.delete(weekKey);
            else next.add(weekKey);
            return next;
        });
    };

    if (weekGroups.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                <div style={{ fontSize: '2.5rem' }}>💸</div>
                <p style={{ margin: '0.5rem 0 0' }}>{t('app.transaction.table.empty')}</p>
            </div>
        );
    }

    const fmt = (n: number) => formatCurrency(n, locale);

    return (
        <div className="tx-week-list">
            {weekGroups.map(({ weekKey, label, days, totals }) => {
                const isCollapsed = collapsedWeeks.has(weekKey);
                return (
                    <div key={weekKey} className="tx-week-block">
                        {/* Week header — clickable to collapse/expand */}
                        <div
                            className="tx-week-header tx-week-header--clickable"
                            onClick={() => toggleWeek(weekKey)}
                            role="button"
                            tabIndex={0}
                            aria-expanded={!isCollapsed}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleWeek(weekKey); }}
                        >
                            <span className="tx-week-label">
                                <svg
                                    className={`tx-week-chevron${isCollapsed ? ' tx-week-chevron--collapsed' : ''}`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                                📅 {label}
                            </span>
                            <div className="tx-week-totals">
                                {totals.income > 0 && (
                                    <span className="tx-week-total tx-week-total--income">
                                        +{fmt(totals.income)}
                                    </span>
                                )}
                                {totals.expenses > 0 && (
                                    <span className="tx-week-total tx-week-total--expense">
                                        -{fmt(totals.expenses)}
                                    </span>
                                )}
                                {totals.saving > 0 && (
                                    <span className="tx-week-total tx-week-total--saving">
                                        🏦 {fmt(totals.saving)}
                                    </span>
                                )}
                                <span className={`tx-week-total tx-week-total--balance${totals.balance >= 0 ? ' tx-week-total--pos' : ' tx-week-total--neg'}`}>
                                    = {totals.balance >= 0 ? '+' : ''}{fmt(totals.balance)}
                                </span>
                            </div>
                        </div>

                        {/* Days inside this week — hidden when collapsed */}
                        {!isCollapsed && days.map(({ dayKey, label: dayLabel, items }) => (
                            <div key={dayKey} className="tx-week-day">
                                <div className="tx-day-header">
                                    <span>{dayLabel}</span>
                                    <span className="tx-day-count">({items.length})</span>
                                </div>
                                <div className="tx-card-list" style={{ display: 'block' }}>
                                    {items.map((tx) => (
                                        <div key={tx.id} className={`tx-week-item tx-week-item--${tx.type.toLowerCase()}`}>
                                            <div className="tx-week-item-accent" />
                                            <div className="tx-week-item-body">
                                                <span className="tx-week-item-desc">{tx.description}</span>
                                                {tx.category && (
                                                    <span className="tx-week-item-cat">{tx.category}</span>
                                                )}
                                            </div>
                                            <div className="tx-week-item-right">
                                                <span className={`tx-badge ${txBadgeClass(tx.type)}`}>
                                                    {tx.type === 'INCOME'
                                                        ? t('app.transaction.form.type.income')
                                                        : tx.type === 'SAVING'
                                                            ? t('app.transaction.form.type.saving')
                                                            : t('app.transaction.form.type.expense')}
                                                </span>
                                                <span className={`tx-week-item-amount ${txAmountColor(tx.type)}`}>
                                                    {tx.type === 'EXPENSE' ? '−' : '+'}{fmt(tx.amount)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
