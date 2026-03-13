import {
    groupByDay,
    groupByWeek,
    buildCalendarMonth,
    isoWeekKey,
    txDayKey,
} from '@modules/finances/domain/transactionGrouping';
import type { Transaction } from '@modules/finances/domain/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<Transaction> & { id: string; date: string; amount: number; type: Transaction['type'] }): Transaction {
    return {
        description: 'Test',
        category: '',
        createdAt: overrides.date ?? '',
        notes: null,
        ...overrides,
    };
}

const TX_MAR_06 = makeTx({ id: '1', date: '2026-03-06T10:00:00Z', amount: 100, type: 'INCOME' });
const TX_MAR_06B = makeTx({ id: '2', date: '2026-03-06T15:00:00Z', amount: 50, type: 'EXPENSE' });
const TX_MAR_07 = makeTx({ id: '3', date: '2026-03-07T09:00:00Z', amount: 200, type: 'EXPENSE' });
const TX_MAR_10 = makeTx({ id: '4', date: '2026-03-10T12:00:00Z', amount: 300, type: 'INCOME' });
const TX_MAR_16 = makeTx({ id: '5', date: '2026-03-16T12:00:00Z', amount: 400, type: 'SAVING' });

// ─── txDayKey ─────────────────────────────────────────────────────────────────

describe('txDayKey', () => {
    test('returns YYYY-MM-DD in Europe/Madrid timezone', () => {
        // UTC midnight → still Mar 6 in Madrid (UTC+1)
        expect(txDayKey('2026-03-06T00:00:00Z')).toBe('2026-03-06');
    });

    test('handles date strings without time', () => {
        expect(txDayKey('2026-03-10T12:00:00Z')).toBe('2026-03-10');
    });
});

// ─── isoWeekKey ───────────────────────────────────────────────────────────────

describe('isoWeekKey', () => {
    test('Mar 6 2026 (Friday) is in week W10', () => {
        expect(isoWeekKey('2026-03-06')).toBe('2026-W10');
    });

    test('Mar 9 2026 (Monday) starts week W11', () => {
        expect(isoWeekKey('2026-03-09')).toBe('2026-W11');
    });

    test('Mar 15 2026 (Sunday) ends week W11', () => {
        expect(isoWeekKey('2026-03-15')).toBe('2026-W11');
    });

    test('Dec 31 2025 is in week W01 of 2026 (ISO)', () => {
        expect(isoWeekKey('2025-12-29')).toBe('2026-W01');
    });
});

// ─── groupByDay ───────────────────────────────────────────────────────────────

describe('groupByDay', () => {
    test('returns empty array for no transactions', () => {
        expect(groupByDay([], 'es-ES')).toEqual([]);
    });

    test('groups two transactions on the same day together', () => {
        const groups = groupByDay([TX_MAR_06, TX_MAR_06B], 'es-ES');
        expect(groups).toHaveLength(1);
        expect(groups[0].dayKey).toBe('2026-03-06');
        expect(groups[0].items).toHaveLength(2);
    });

    test('creates separate groups for different days', () => {
        const groups = groupByDay([TX_MAR_06, TX_MAR_07], 'es-ES');
        expect(groups).toHaveLength(2);
        expect(groups[0].dayKey).toBe('2026-03-06');
        expect(groups[1].dayKey).toBe('2026-03-07');
    });

    test('preserves original order within a day group', () => {
        const groups = groupByDay([TX_MAR_06, TX_MAR_06B], 'es-ES');
        expect(groups[0].items[0].id).toBe('1');
        expect(groups[0].items[1].id).toBe('2');
    });

    test('each group has a non-empty label', () => {
        const groups = groupByDay([TX_MAR_06], 'es-ES');
        expect(groups[0].label.length).toBeGreaterThan(0);
    });

    test('label changes with locale', () => {
        const es = groupByDay([TX_MAR_06], 'es-ES')[0].label;
        const en = groupByDay([TX_MAR_06], 'en-GB')[0].label;
        expect(es).not.toBe(en);
    });
});

// ─── groupByWeek ──────────────────────────────────────────────────────────────

describe('groupByWeek', () => {
    test('returns empty array for no transactions', () => {
        expect(groupByWeek([], 'es-ES')).toEqual([]);
    });

    test('two days in the same week produce one WeekGroup', () => {
        // Mar 6 (Fri) and Mar 7 (Sat) are both in W10
        const groups = groupByWeek([TX_MAR_06, TX_MAR_07], 'es-ES');
        expect(groups).toHaveLength(1);
        expect(groups[0].weekKey).toBe('2026-W10');
    });

    test('days in different weeks produce separate WeekGroups', () => {
        // Mar 6 (W10) and Mar 10 (W11)
        const groups = groupByWeek([TX_MAR_06, TX_MAR_10], 'es-ES');
        expect(groups).toHaveLength(2);
    });

    test('totals are calculated correctly', () => {
        // TX_MAR_06: INCOME 100, TX_MAR_06B: EXPENSE 50, TX_MAR_07: EXPENSE 200 → all W10
        const groups = groupByWeek([TX_MAR_06, TX_MAR_06B, TX_MAR_07], 'es-ES');
        expect(groups[0].totals.income).toBe(100);
        expect(groups[0].totals.expenses).toBe(250);
        expect(groups[0].totals.saving).toBe(0);
        expect(groups[0].totals.balance).toBe(100 - 250 - 0); // -150
    });

    test('saving transactions counted in totals', () => {
        const groups = groupByWeek([TX_MAR_16], 'es-ES');
        expect(groups[0].totals.saving).toBe(400);
        expect(groups[0].totals.balance).toBe(-400);
    });

    test('each week contains the correct day groups', () => {
        const groups = groupByWeek([TX_MAR_06, TX_MAR_06B, TX_MAR_07], 'es-ES');
        // W10: Mar 6 and Mar 7
        expect(groups[0].days).toHaveLength(2);
        expect(groups[0].days[0].dayKey).toBe('2026-03-06');
        expect(groups[0].days[1].dayKey).toBe('2026-03-07');
    });

    test('week label is a non-empty string', () => {
        const groups = groupByWeek([TX_MAR_06], 'es-ES');
        expect(groups[0].label.length).toBeGreaterThan(0);
    });
});

// ─── buildCalendarMonth ───────────────────────────────────────────────────────

describe('buildCalendarMonth', () => {
    test('always returns exactly 6 rows', () => {
        const rows = buildCalendarMonth(2026, 3, []);
        expect(rows).toHaveLength(6);
    });

    test('each row has exactly 7 cells', () => {
        const rows = buildCalendarMonth(2026, 3, []);
        rows.forEach(row => expect(row).toHaveLength(7));
    });

    test('total cells are always 42', () => {
        const rows = buildCalendarMonth(2026, 3, []);
        expect(rows.flat()).toHaveLength(42);
    });

    test('non-month padding cells have dayKey=null and dayNumber=null', () => {
        const rows = buildCalendarMonth(2026, 3, []);
        // March 2026 starts on Sunday → 6 padding cells at start (ISO: Mon=0)
        const allCells = rows.flat();
        const paddingCells = allCells.filter(c => c.dayKey === null);
        expect(paddingCells.every(c => c.dayNumber === null)).toBe(true);
        expect(paddingCells.every(c => c.items.length === 0)).toBe(true);
    });

    test('all 31 days of March 2026 appear exactly once', () => {
        const rows = buildCalendarMonth(2026, 3, []);
        const dayNumbers = rows.flat()
            .filter(c => c.dayNumber !== null)
            .map(c => c.dayNumber);
        expect(dayNumbers).toHaveLength(31);
        for (let d = 1; d <= 31; d++) {
            expect(dayNumbers).toContain(d);
        }
    });

    test('transactions are placed in the correct day cell', () => {
        const rows = buildCalendarMonth(2026, 3, [TX_MAR_06, TX_MAR_07]);
        const allCells = rows.flat();
        const cell6 = allCells.find(c => c.dayKey === '2026-03-06');
        const cell7 = allCells.find(c => c.dayKey === '2026-03-07');
        expect(cell6?.items).toHaveLength(1);
        expect(cell6?.items[0].id).toBe('1');
        expect(cell7?.items).toHaveLength(1);
    });

    test('multiple transactions on same day all appear in the same cell', () => {
        const rows = buildCalendarMonth(2026, 3, [TX_MAR_06, TX_MAR_06B]);
        const cell = rows.flat().find(c => c.dayKey === '2026-03-06');
        expect(cell?.items).toHaveLength(2);
    });

    test('days with no transactions have empty items array', () => {
        const rows = buildCalendarMonth(2026, 3, [TX_MAR_06]);
        const cell10 = rows.flat().find(c => c.dayKey === '2026-03-10');
        expect(cell10?.items).toEqual([]);
    });

    test('works correctly for February in a leap year (2028)', () => {
        const rows = buildCalendarMonth(2028, 2, []);
        const dayNumbers = rows.flat()
            .filter(c => c.dayNumber !== null)
            .map(c => c.dayNumber);
        expect(dayNumbers).toHaveLength(29); // 2028 is leap year
    });

    test('works correctly for February in a non-leap year (2026)', () => {
        const rows = buildCalendarMonth(2026, 2, []);
        const dayNumbers = rows.flat()
            .filter(c => c.dayNumber !== null)
            .map(c => c.dayNumber);
        expect(dayNumbers).toHaveLength(28);
    });
});
