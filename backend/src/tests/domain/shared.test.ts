import { ValidationError } from '@domain/errors';
import { fromCents, toCents } from '@domain/shared/money';
import { assertStrongPassword, passwordProblems } from '@domain/shared/password-policy';
import {
  addMonths,
  currentPeriod,
  normalizeStartDay,
  periodEnd,
  periodOfDate,
  periodStart,
  periodsBetween,
  toDateOnly,
} from '@domain/shared/period';
import { normalizeText } from '@domain/shared/text';

describe('money', () => {
  it.each([
    [12.34, 1234],
    [0.1, 10],
    [1.005, 101],
    [19.99, 1999],
    [1234567.89, 123456789],
  ])('toCents(%p) = %p', (amount, cents) => {
    expect(toCents(amount)).toBe(cents);
  });

  it('round-trips through fromCents', () => {
    expect(fromCents(toCents(0.1) + toCents(0.2))).toBe(0.3);
  });

  it('rejects non numbers', () => {
    expect(() => toCents(NaN)).toThrow(ValidationError);
    expect(() => toCents(Infinity)).toThrow(ValidationError);
  });
});

describe('period', () => {
  it('validates and normalises dates', () => {
    expect(toDateOnly('2026-03-04T11:00:00.000Z')).toBe('2026-03-04');
    expect(toDateOnly('2024-02-29')).toBe('2024-02-29');
    expect(() => toDateOnly('2026-02-29')).toThrow('Fecha inválida');
    expect(() => toDateOnly('04/03/2026')).toThrow(ValidationError);
  });

  it('adds months across years', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 5 }, -17)).toEqual({ year: 2024, month: 12 });
  });

  it('uses calendar months with start day 1', () => {
    expect(periodOfDate('2026-03-31', 1)).toEqual({ year: 2026, month: 3 });
    expect(periodStart({ year: 2026, month: 2 })).toBe('2026-02-01');
    expect(periodEnd({ year: 2026, month: 2 })).toBe('2026-02-28');
    expect(periodEnd({ year: 2024, month: 2 })).toBe('2024-02-29');
  });

  it('start days up to 15 name the period after the month where it starts', () => {
    expect(periodOfDate('2026-03-05', 5)).toEqual({ year: 2026, month: 3 });
    expect(periodOfDate('2026-04-04', 5)).toEqual({ year: 2026, month: 3 });
    expect(periodStart({ year: 2026, month: 3 }, 5)).toBe('2026-03-05');
    expect(periodEnd({ year: 2026, month: 3 }, 5)).toBe('2026-04-04');
  });

  it('start days after 15 name the period after the month where it ends (payday on the 25th)', () => {
    expect(periodOfDate('2026-03-25', 25)).toEqual({ year: 2026, month: 4 });
    expect(periodOfDate('2026-04-24', 25)).toEqual({ year: 2026, month: 4 });
    expect(periodOfDate('2026-12-30', 25)).toEqual({ year: 2027, month: 1 });
    expect(periodStart({ year: 2027, month: 1 }, 25)).toBe('2026-12-25');
    expect(periodEnd({ year: 2027, month: 1 }, 25)).toBe('2027-01-24');
  });

  it('every period contains its own start and end for all start days', () => {
    for (let day = 1; day <= 28; day++) {
      for (const p of periodsBetween({ year: 2025, month: 11 }, { year: 2026, month: 3 })) {
        expect(periodOfDate(periodStart(p, day), day)).toEqual(p);
        expect(periodOfDate(periodEnd(p, day), day)).toEqual(p);
      }
    }
  });

  it('clamps start days and computes the current period from a clock', () => {
    expect(normalizeStartDay(31)).toBe(28);
    expect(normalizeStartDay(0)).toBe(1);
    expect(currentPeriod(25, new Date(2026, 2, 26, 12))).toEqual({ year: 2026, month: 4 });
  });
});

describe('password policy', () => {
  it('lists every problem and accepts strong passwords', () => {
    expect(passwordProblems('abc')).toEqual([
      'al menos 8 caracteres',
      'una mayúscula',
      'un número',
      'un símbolo',
    ]);
    expect(() => assertStrongPassword('Str0ng-pass')).not.toThrow();
    expect(() => assertStrongPassword('weakpassword')).toThrow(
      expect.objectContaining({ code: 'WEAK_PASSWORD' })
    );
  });
});

describe('normalizeText', () => {
  it('removes accents, case and repeated spaces', () => {
    expect(normalizeText('  Nómina   ENERO ')).toBe('nomina enero');
  });
});
