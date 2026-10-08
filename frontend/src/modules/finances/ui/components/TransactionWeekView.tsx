import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { EmptyState } from '@shared/components/EmptyState';
import { useToggleSet } from '@shared/hooks/useToggleSet';
import type { WeekGroup } from '@modules/finances/domain/transactionGrouping';
import type { Transaction } from '@modules/finances/domain/types';
import { SignedAmount, TypeBadge } from './TransactionBits';
import '../css/TransactionViews.css';

/** Compact movement row shared by the week view and the calendar day popup. */
export function MovementItem({ tx, prefix }: { tx: Transaction; prefix: 'tx-week' | 'cal-modal' }) {
  const { tCategory } = useI18n();
  return (
    <div className={`${prefix}-item ${prefix}-item--${tx.type.toLowerCase()}`}>
      <div className={`${prefix}-item-accent`} />
      <div className={`${prefix}-item-body`}>
        <span className={`${prefix}-item-desc`}>{tx.description}</span>
        <span className={`${prefix}-item-cat`}>{tCategory(tx.category)}</span>
      </div>
      <div className={`${prefix}-item-right`}>
        <TypeBadge type={tx.type} />
        <SignedAmount className={`${prefix}-item-amount`} type={tx.type} amount={tx.amount} />
      </div>
    </div>
  );
}

function WeekTotals({ totals }: { totals: WeekGroup['totals'] }) {
  const { money } = useFormat();
  const positive = totals.balance >= 0;
  return (
    <div className="tx-week-totals">
      {totals.income > 0 && (
        <span className="tx-week-total tx-week-total--income">+{money(totals.income)}</span>
      )}
      {totals.expenses > 0 && (
        <span className="tx-week-total tx-week-total--expense">−{money(totals.expenses)}</span>
      )}
      {totals.saving > 0 && (
        <span className="tx-week-total tx-week-total--saving">🏦 {money(totals.saving)}</span>
      )}
      <span
        className={`tx-week-total tx-week-total--balance tx-week-total--${
          positive ? 'pos' : 'neg'
        }`}
      >
        = {positive ? '+' : ''}
        {money(totals.balance)}
      </span>
    </div>
  );
}

/** Movements grouped by week; weeks start collapsed and show their totals. */
export function TransactionWeekView({ weekGroups }: { weekGroups: WeekGroup[] }) {
  const { t } = useI18n();
  const expanded = useToggleSet();

  if (weekGroups.length === 0) {
    return <EmptyState icon="💸" text={t('app.transaction.table.empty')} />;
  }

  return (
    <div className="tx-week-list">
      {weekGroups.map(({ weekKey, label, days, totals }) => {
        const open = expanded.has(weekKey);
        return (
          <div key={weekKey} className="tx-week-block">
            <button
              type="button"
              className="tx-week-header tx-week-header--clickable"
              onClick={() => expanded.toggle(weekKey)}
              aria-expanded={open}
            >
              <span className="tx-week-label">
                <svg
                  className={`tx-week-chevron${open ? '' : ' tx-week-chevron--collapsed'}`}
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
              <WeekTotals totals={totals} />
            </button>

            {open &&
              days.map(({ dayKey, label: dayLabel, items }) => (
                <div key={dayKey} className="tx-week-day">
                  <div className="tx-day-header">
                    <span>{dayLabel}</span>
                    <span className="tx-day-count">({items.length})</span>
                  </div>
                  <div className="tx-week-items">
                    {items.map((tx) => (
                      <MovementItem key={tx.id} tx={tx} prefix="tx-week" />
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
