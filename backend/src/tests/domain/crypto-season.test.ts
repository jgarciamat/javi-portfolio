import {
  SeasonEntry,
  activity,
  aliasProblem,
  compareEntries,
  daysLeft,
  madridDay,
  madridMonth,
  missing,
  monthStartsAt,
  monthsBefore,
  nextMonth,
  playerAlias,
  previousMonth,
  qualifies,
  rank,
  rankingAlias,
  returnPercent,
  seasonEndsAt,
  suggestedAlias,
} from '@domain/services/crypto-season';

// Invented entries: only the numbers that matter for the order.
const entry = (key: string, over: Partial<SeasonEntry> = {}): SeasonEntry => ({
  key,
  finalCents: 1_100_000,
  initialCents: 1_000_000,
  trades: 5,
  activeDays: 3,
  reachedAt: '2026-03-10T10:00:00.000Z',
  ...over,
});

describe('crypto seasons (Spanish calendar months)', () => {
  it('starts and ends months at midnight in Madrid, in winter and in summer time', () => {
    expect(monthStartsAt('2026-01').toISOString()).toBe('2025-12-31T23:00:00.000Z');
    expect(monthStartsAt('2026-04').toISOString()).toBe('2026-03-31T22:00:00.000Z');
    // October ends in winter time (the clocks go back on its last Sunday).
    expect(seasonEndsAt('2026-10').toISOString()).toBe('2026-10-31T23:00:00.000Z');
    expect(seasonEndsAt('2026-12').toISOString()).toBe('2026-12-31T23:00:00.000Z');
    expect(madridMonth(new Date('2026-10-31T22:59:59Z'))).toBe('2026-10');
    expect(madridMonth(Date.parse('2026-10-31T23:00:00Z'))).toBe('2026-11');
    expect(madridDay('2026-03-15T23:30:00Z')).toBe('2026-03-16');
    expect(madridDay(new Date('2026-03-15T22:59:00Z'))).toBe('2026-03-15');
    expect(madridDay(Date.parse('2026-07-01T00:00:00Z'))).toBe('2026-07-01');
  });

  it('moves between months', () => {
    expect(nextMonth('2026-12')).toBe('2027-01');
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(previousMonth('2026-11')).toBe('2026-10');
    expect(monthsBefore('2026-03', 12)).toBe('2025-03');
    expect(monthsBefore('2026-03', 0)).toBe('2026-03');
  });

  it('counts whole days left, 0 on the last one', () => {
    expect(daysLeft('2026-10', new Date('2026-10-31T12:00:00Z'))).toBe(0);
    expect(daysLeft('2026-10', new Date('2026-10-30T12:00:00Z'))).toBe(1);
    expect(daysLeft('2026-10', new Date('2026-11-02T12:00:00Z'))).toBe(0);
  });

  it('measures the return over the play money of the start', () => {
    expect(returnPercent(1_150_000, 1_000_000)).toBe(15);
    expect(returnPercent(850_050, 1_000_000)).toBe(-15);
    expect(returnPercent(0, 1_000_000)).toBe(-100);
  });
});

describe('crypto ranking', () => {
  it('asks only for 5 operations closed: the days with activity no longer matter', () => {
    expect(qualifies({ trades: 5 })).toBe(true);
    expect(qualifies({ trades: 9 })).toBe(true);
    expect(qualifies({ trades: 4 })).toBe(false);
    // Five operations in a single day are enough; four are not, however many days.
    expect(qualifies(entry('one-day', { trades: 5, activeDays: 1 }))).toBe(true);
    expect(qualifies(entry('many-days', { trades: 4, activeDays: 20 }))).toBe(false);
    expect(missing({ trades: 2 })).toEqual({ trades: 3, days: 0 });
    expect(missing({ trades: 4 })).toEqual({ trades: 1, days: 0 });
    expect(missing({ trades: 7 })).toEqual({ trades: 0, days: 0 });
  });

  it('breaks ties without the days: more operations, then who reached it first', () => {
    const fewDays = entry('a', { trades: 6, activeDays: 1 });
    const manyDays = entry('b', { trades: 5, activeDays: 20 });
    const first = entry('c', { trades: 5, activeDays: 1, reachedAt: '2026-03-03T10:00:00.000Z' });
    expect(rank([manyDays, fewDays, first]).map((e) => e.key)).toEqual(['a', 'c', 'b']);
    expect(compareEntries(entry('x', { activeDays: 1 }), entry('y', { activeDays: 9 }))).toBe(-1);
  });

  it('orders by return, then operations, then who reached it first, then a stable key', () => {
    const best = entry('a', { finalCents: 1_200_000 });
    const moreTrades = entry('b', { trades: 9 });
    const earlier = entry('c', { reachedAt: '2026-03-02T10:00:00.000Z' });
    const later = entry('d');
    const noDate = entry('e', { reachedAt: null });
    const sameAsLater = entry('f');
    const short = entry('g', { trades: 4, finalCents: 9_000_000 });
    expect(
      rank([sameAsLater, noDate, later, earlier, moreTrades, best, short]).map((e) => e.key)
    ).toEqual(['a', 'b', 'c', 'd', 'f', 'e']);
    expect(compareEntries(later, later)).toBe(0);
    expect(compareEntries(sameAsLater, later)).toBe(1);
    // Different starting money compares the return, not the euros.
    expect(
      compareEntries(
        entry('x', { finalCents: 11_000_000, initialCents: 10_000_000 }),
        entry('y', { finalCents: 1_200_000 })
      )
    ).toBeGreaterThan(0);
  });

  it('counts the operations closed and the days (Madrid) with activity', () => {
    expect(
      activity([
        { openedAt: '2026-03-02T10:00:00Z', closedAt: '2026-03-02T23:30:00Z', closeType: 'market' },
        { openedAt: '2026-03-04T10:00:00Z', closedAt: '2026-03-04T11:00:00Z', closeType: 'limit' },
        { openedAt: '2026-03-05T10:00:00Z', closedAt: null, closeType: null },
        { openedAt: '2026-03-06T10:00:00Z', closedAt: '2026-03-31T21:59:59Z', closeType: 'season' },
      ])
    ).toEqual({ trades: 2, activeDays: 5, reachedAt: '2026-03-04T11:00:00Z' });
    expect(activity([])).toEqual({ trades: 0, activeDays: 0, reachedAt: null });
  });
});

describe('ranking alias', () => {
  it('accepts plain names, letters with accents, numbers and simple signs', () => {
    for (const ok of ['Ana', 'José Luis', 'Lince_77', 'mar-ia', 'J.R.', 'Economista', 'Dickens']) {
      expect(aliasProblem(ok)).toBeNull();
    }
  });

  it('refuses e-mails, links, phone numbers, odd signs and offensive words', () => {
    expect(aliasProblem('yo@x')).toBe('contact');
    expect(aliasProblem('http:yo')).toBe('contact');
    expect(aliasProblem('tienda.app')).toBe('contact');
    expect(aliasProblem('Tel 612 345 678')).toBe('contact');
    expect(aliasProblem('_raro')).toBe('characters');
    expect(aliasProblem('hola!')).toBe('characters');
    expect(aliasProblem('Mierdaseca')).toBe('words');
    expect(aliasProblem('el nazi')).toBe('words');
    expect(aliasProblem('Admin del sitio')).toBe('words');
    expect(aliasProblem('    ab    ')).toBe('length');
  });

  it('proposes the first name when it is a valid alias', () => {
    expect(suggestedAlias('  María   García ')).toBe('María');
    expect(suggestedAlias('Al')).toBeNull();
    expect(suggestedAlias('')).toBeNull();
    expect(suggestedAlias('Bartolomeoalexandrinopio Ruiz')).toBe('Bartolomeoalexandrin');
  });

  it('gives «Jugador» and four digits that never change for the same person', () => {
    const id = '0b6f1c3e-5d2a-4f7b-9c1e-2a3b4c5d6e7f';
    expect(playerAlias(id)).toMatch(/^Jugador\d{4}$/);
    expect(playerAlias(id)).toBe(playerAlias(id));
    expect(playerAlias(id)).not.toBe(playerAlias('another-user'));
    expect(aliasProblem(playerAlias(id))).toBeNull();
  });

  it('shows the chosen alias, else the first name, else «Jugador»', () => {
    expect(rankingAlias('Lince', 'María García', 'u1')).toBe('Lince');
    expect(rankingAlias(null, 'María García', 'u1')).toBe('María');
    expect(rankingAlias(null, 'X', 'u1')).toBe(playerAlias('u1'));
  });
});
