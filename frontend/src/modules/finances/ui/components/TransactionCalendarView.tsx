import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type { CalendarCell } from '@modules/finances/domain/transactionGrouping';
import { totalsByType } from '@modules/finances/domain/transactionTypes';
import { CalendarDayModal } from './CalendarDayModal';
import '../css/TransactionViews.css';

interface TransactionCalendarViewProps {
  calendarRows: CalendarCell[][];
  year: number;
  month: number;
  /** Period range when it is not a calendar month (custom month start day). */
  range?: { start: string; end: string } | null;
}

/** Monday-first initials of the week days in the user's language. */
function weekdayInitials(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i, 12)));
}

function DayCell({ cell, onOpen }: { cell: CalendarCell; onOpen: (dayKey: string) => void }) {
  const { money } = useFormat();
  if (!cell.dayKey) return <div className="tx-calendar-cell tx-calendar-cell--empty" />;
  const dayKey = cell.dayKey;
  if (cell.items.length === 0) {
    return (
      <div className="tx-calendar-cell">
        <span className="tx-calendar-day-num">{cell.dayNumber}</span>
      </div>
    );
  }
  const totals = totalsByType(cell.items);
  return (
    <button
      type="button"
      className="tx-calendar-cell tx-calendar-cell--has-tx"
      onClick={() => onOpen(dayKey)}
    >
      <span className="tx-calendar-day-num">{cell.dayNumber}</span>
      {totals.income > 0 && (
        <span className="tx-calendar-bal tx-calendar-bal--income">+{money(totals.income)}</span>
      )}
      {totals.expenses > 0 && (
        <span className="tx-calendar-bal tx-calendar-bal--expense">−{money(totals.expenses)}</span>
      )}
      {totals.saving > 0 && (
        <span className="tx-calendar-bal tx-calendar-bal--saving">{money(totals.saving)}</span>
      )}
    </button>
  );
}

export function TransactionCalendarView({
  calendarRows,
  year,
  month,
  range,
}: TransactionCalendarViewProps) {
  const { locale } = useI18n();
  const format = useFormat();
  // The day is kept, not the cell: after a refresh the popup shows the fresh movements.
  const [openDay, setOpenDay] = useState<string | null>(null);
  const cells = calendarRows.flat();
  const openItems = cells.find((c) => c.dayKey === openDay)?.items ?? [];
  const title = range ? format.range(range.start, range.end) : format.monthLabel(year, month);

  return (
    <div className="tx-calendar">
      <div className="tx-calendar-title">{title}</div>
      <div className="tx-calendar-grid">
        {weekdayInitials(locale).map((d, i) => (
          <div key={i} className="tx-calendar-weekday" aria-hidden="true">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => (
          <DayCell key={cell.dayKey ?? `pad-${i}`} cell={cell} onOpen={setOpenDay} />
        ))}
      </div>
      {openDay && openItems.length > 0 && (
        <CalendarDayModal dayKey={openDay} items={openItems} onClose={() => setOpenDay(null)} />
      )}
    </div>
  );
}
