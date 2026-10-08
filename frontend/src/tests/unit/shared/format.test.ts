jest.mock('@core/i18n/I18nContext', () => ({
  useI18n: () => ({
    locale: 'es',
    setLocale: jest.fn(),
    t: (k: string) => k,
    tCategory: (n: string) => n,
  }),
}));

import {
  formatDate,
  formatMoney,
  formatPercent,
  formatRange,
  monthLabel,
  monthName,
  parseDateOnly,
  toDateOnly,
} from '@shared/utils/format';
import {
  buildCalendarMonth,
  formatDayLabel,
  txDayKey,
} from '@modules/finances/domain/transactionGrouping';
import { csvCell } from '@modules/finances/application/hooks/useExportCSV';
import type { Transaction } from '@modules/finances/domain/types';

const nbsp = (s: string) => s.replace(/\u00a0|\u202f/g, ' ');

describe('format utils', () => {
  it('formats money in the user currency and language', () => {
    expect(nbsp(formatMoney(1234.5, 'EUR', 'es'))).toBe('1234,50 €');
    expect(nbsp(formatMoney(1234.5, 'USD', 'en'))).toBe('US$1,234.50');
    expect(nbsp(formatMoney(-20, 'EUR', 'es', { decimals: false }))).toBe('-20 €');
    expect(nbsp(formatMoney(15, 'EUR', 'es', { signed: true }))).toBe('+15,00 €');
  });

  it('formats percentages with the locale decimal separator', () => {
    expect(formatPercent(20, 'es')).toBe('20,0%');
    expect(formatPercent(12.345, 'en', 2)).toBe('12.35%');
  });

  it('translates month names (old bug: always Spanish)', () => {
    expect(monthName(3, 'es')).toBe('Marzo');
    expect(monthName(3, 'en')).toBe('March');
    expect(monthName(9, 'es', 'short')).toMatch(/^Sep/);
    expect(monthLabel(2026, 1, 'en')).toBe('January 2026');
  });

  it('parses calendar dates without time zone shifts', () => {
    const d = parseDateOnly('2026-03-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 1]);
    expect(toDateOnly(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
    expect(formatDate('2026-03-04', 'es')).toMatch(/4 mar/);
    expect(formatRange('2026-03-25', '2026-04-24', 'en')).toMatch(/25 Mar – 24 Apr/);
  });
});

describe('transaction grouping with calendar dates', () => {
  const tx = (date: string): Transaction => ({
    id: date,
    description: 'x',
    amount: 1,
    type: 'EXPENSE',
    category: 'Ocio',
    date,
    createdAt: date,
    notes: null,
  });

  it('uses the date as-is (no Europe/Madrid conversion)', () => {
    expect(txDayKey('2026-03-01')).toBe('2026-03-01');
    expect(formatDayLabel('2026-03-02', 'en-GB')).toMatch(/Mon/);
  });

  it('builds the calendar of a custom period (25 Mar – 24 Apr)', () => {
    const rows = buildCalendarMonth(2026, 4, [tx('2026-03-30'), tx('2026-04-24')], {
      start: '2026-03-25',
      end: '2026-04-24',
    });
    const days = rows.flat().filter((c) => c.dayKey);
    expect(days[0].dayKey).toBe('2026-03-25');
    expect(days[days.length - 1].dayKey).toBe('2026-04-24');
    expect(days).toHaveLength(31);
    expect(rows.flat().find((c) => c.dayKey === '2026-03-30')!.items).toHaveLength(1);
    // 25 March 2026 is a Wednesday: two padding cells before it
    expect(rows[0].slice(0, 2).every((c) => c.dayKey === null)).toBe(true);
  });

  it('keeps calendar months for the default start day', () => {
    const rows = buildCalendarMonth(2026, 2, []);
    const days = rows.flat().filter((c) => c.dayKey);
    expect(days).toHaveLength(28);
    expect(rows.flat().length % 7).toBe(0);
  });
});

describe('csvCell', () => {
  it('quotes text and neutralises spreadsheet formulas', () => {
    expect(csvCell('Bar "Pepe"')).toBe('"Bar ""Pepe"""');
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('-5 descuento')).toBe('"\'-5 descuento"');
    expect(csvCell(-5)).toBe('"-5"');
    expect(csvCell(null)).toBe('""');
  });
});
