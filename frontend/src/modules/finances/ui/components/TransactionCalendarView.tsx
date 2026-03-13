import '../css/TransactionViews.css';
import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { formatCurrency } from '../types/TransactionTable.types';
import { CalendarDayModal } from './CalendarDayModal';
import type { CalendarCell } from '@modules/finances/domain/transactionGrouping';
import type { Transaction } from '@modules/finances/domain/types';

interface Props {
    calendarRows: CalendarCell[][];
    year: number;
    month: number;
}

const WEEKDAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Compute separate totals for income / expenses / saving */
function cellTotals(items: Transaction[]) {
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

// ─── Sub-component: single calendar cell ─────────────────────────────────────

interface CalendarCellProps {
    cell: CalendarCell;
    isSelected: boolean;
    onSelect: (cell: CalendarCell | null) => void;
    fmt: (n: number) => string;
}

function CellAmounts({ totals, fmt }: { totals: ReturnType<typeof cellTotals>; fmt: (n: number) => string }) {
    return (
        <>
            {totals.income > 0 && <span className="tx-calendar-bal tx-calendar-bal--income">+{fmt(totals.income)}</span>}
            {totals.expenses > 0 && <span className="tx-calendar-bal tx-calendar-bal--expense">−{fmt(totals.expenses)}</span>}
            {totals.saving > 0 && <span className="tx-calendar-bal tx-calendar-bal--saving">{fmt(totals.saving)}</span>}
        </>
    );
}

function CalendarDayCell({ cell, isSelected, onSelect, fmt }: CalendarCellProps) {
    if (!cell.dayKey) {
        return <div className="tx-calendar-cell tx-calendar-cell--empty" />;
    }

    const hasItems = cell.items.length > 0;
    const classes = ['tx-calendar-cell', hasItems && 'tx-calendar-cell--has-tx', isSelected && 'tx-calendar-cell--selected']
        .filter(Boolean).join(' ');

    const handleClick = () => hasItems && onSelect(isSelected ? null : cell);
    const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleClick(); };

    return (
        <div
            className={classes}
            onClick={handleClick}
            role={hasItems ? 'button' : undefined}
            aria-pressed={isSelected}
            tabIndex={hasItems ? 0 : undefined}
            onKeyDown={hasItems ? handleKey : undefined}
        >
            <span className="tx-calendar-day-num">{cell.dayNumber}</span>
            {hasItems && <CellAmounts totals={cellTotals(cell.items)} fmt={fmt} />}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TransactionCalendarView({ calendarRows, year, month }: Props) {
    const { locale } = useI18n();
    const [selectedCell, setSelectedCell] = useState<CalendarCell | null>(null);

    const isES = locale.startsWith('es');
    const weekdays = isES ? WEEKDAYS_ES : WEEKDAYS_EN;
    const fmt = (n: number) => formatCurrency(Math.abs(n), locale);

    const monthLabel = new Intl.DateTimeFormat(locale, {
        month: 'long', year: 'numeric', timeZone: 'Europe/Madrid',
    }).format(new Date(year, month - 1, 1));

    return (
        <div className="tx-calendar">
            <div className="tx-calendar-title">{monthLabel}</div>

            <div className="tx-calendar-grid">
                {weekdays.map((d, i) => (
                    <div key={i} className="tx-calendar-weekday">{d}</div>
                ))}
                {calendarRows.flat().map((cell, idx) => (
                    <CalendarDayCell
                        key={cell.dayKey ?? `pad-${idx}`}
                        cell={cell}
                        isSelected={selectedCell?.dayKey === cell.dayKey}
                        onSelect={setSelectedCell}
                        fmt={fmt}
                    />
                ))}
            </div>

            {selectedCell && selectedCell.items.length > 0 && (
                <CalendarDayModal
                    dayKey={selectedCell.dayKey!}
                    items={selectedCell.items}
                    onClose={() => setSelectedCell(null)}
                />
            )}
        </div>
    );
}
