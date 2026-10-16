import {
  EXCHANGES,
  MADRID_TZ,
  exchangeById,
  formatDuration,
  formatMinutes,
  localTime,
  marketStatus,
  toMinutes,
  toSpanishTime,
  tzOffsetMinutes,
} from '@modules/invest/domain/markets';

const at = (iso: string) => new Date(iso);
const ex = (id: string) => exchangeById(id) as (typeof EXCHANGES)[number];

describe('market clocks', () => {
  it('converts clock text to minutes and back', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(formatMinutes(570)).toBe('09:30');
    expect(formatMinutes(1500)).toBe('01:00');
    expect(formatMinutes(-60)).toBe('23:00');
  });

  it('reads the local time of a city', () => {
    // Friday 2026-10-16 15:00 UTC: 11:00 in New York (EDT), 17:00 in Madrid (CEST).
    const now = at('2026-10-16T15:00:00Z');
    expect(localTime(now, 'America/New_York')).toEqual({ weekday: 5, minutes: 11 * 60 });
    expect(localTime(now, MADRID_TZ)).toEqual({ weekday: 5, minutes: 17 * 60 });
    expect(localTime(at('2026-10-17T00:30:00Z'), 'Asia/Tokyo')).toEqual({
      weekday: 6,
      minutes: 9 * 60 + 30,
    });
    expect(localTime(at('2026-10-16T22:00:00Z'), MADRID_TZ).minutes).toBe(0);
  });

  it('knows the offset of each city, daylight saving included', () => {
    expect(tzOffsetMinutes(MADRID_TZ, at('2026-07-01T12:00:00Z'))).toBe(120);
    expect(tzOffsetMinutes(MADRID_TZ, at('2026-01-15T12:00:00Z'))).toBe(60);
    expect(tzOffsetMinutes('America/New_York', at('2026-07-01T12:00:00Z'))).toBe(-240);
    expect(tzOffsetMinutes('Asia/Kolkata', at('2026-07-01T12:00:00Z'))).toBe(330);
  });

  it('converts exchange hours to Spanish time on the given day', () => {
    expect(toSpanishTime('09:30', 'America/New_York', at('2026-10-16T12:00:00Z'))).toEqual({
      text: '15:30',
      dayShift: 0,
    });
    // The two sides change the clock on different days: only 5 hours apart.
    expect(toSpanishTime('09:30', 'America/New_York', at('2026-03-20T12:00:00Z')).text).toBe(
      '14:30'
    );
    expect(toSpanishTime('09:00', 'Asia/Tokyo', at('2026-01-15T12:00:00Z')).text).toBe('01:00');
    expect(toSpanishTime('20:00', 'America/New_York', at('2026-10-16T12:00:00Z'))).toEqual({
      text: '02:00',
      dayShift: 1,
    });
    expect(toSpanishTime('00:30', 'Asia/Tokyo', at('2026-10-16T12:00:00Z'))).toEqual({
      text: '17:30',
      dayShift: -1,
    });
  });

  it('formats a duration', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(65)).toBe('1 h 05 min');
    expect(formatDuration(120)).toBe('2 h 00 min');
  });
});

describe('market status', () => {
  it('is open during the session and counts down to the close', () => {
    // 10:00 in Madrid (CEST) is 08:00 UTC.
    expect(marketStatus(ex('bme'), at('2026-10-16T08:00:00Z'))).toEqual({
      state: 'open',
      minutesToChange: 450,
    });
    expect(marketStatus(ex('lse'), at('2026-10-16T09:00:00Z')).state).toBe('open');
  });

  it('is closed before the open (with the time left) and after the close', () => {
    expect(marketStatus(ex('bme'), at('2026-10-16T05:00:00Z'))).toEqual({
      state: 'closed',
      minutesToChange: 120,
    });
    expect(marketStatus(ex('bme'), at('2026-10-16T16:00:00Z'))).toEqual({
      state: 'closed',
      minutesToChange: null,
    });
  });

  it('is closed all weekend', () => {
    expect(marketStatus(ex('bme'), at('2026-10-17T10:00:00Z'))).toEqual({
      state: 'closed',
      minutesToChange: null,
    });
    expect(marketStatus(ex('bme'), at('2026-10-18T10:00:00Z')).state).toBe('closed');
  });

  it('pauses at lunch in Asian exchanges', () => {
    // 04:00 UTC = 12:00 in Shanghai (UTC+8): between 11:30 and 13:00.
    expect(marketStatus(ex('sse'), at('2026-10-16T04:00:00Z'))).toEqual({
      state: 'break',
      minutesToChange: 60,
    });
    expect(marketStatus(ex('sse'), at('2026-10-16T02:00:00Z')).state).toBe('open');
    expect(marketStatus(ex('sse'), at('2026-10-16T06:00:00Z')).state).toBe('open');
    expect(marketStatus(ex('sse'), at('2026-10-16T08:00:00Z')).state).toBe('closed');
  });

  it('shows the pre-market and after-hours of New York', () => {
    // 09:00 UTC = 05:00 in New York (EDT).
    expect(marketStatus(ex('nyse'), at('2026-10-16T09:00:00Z')).state).toBe('pre');
    expect(marketStatus(ex('nyse'), at('2026-10-16T14:00:00Z')).state).toBe('open');
    expect(marketStatus(ex('nyse'), at('2026-10-16T21:00:00Z')).state).toBe('after');
    expect(marketStatus(ex('nyse'), at('2026-10-17T01:00:00Z')).state).toBe('closed');
    expect(marketStatus(ex('nyse'), at('2026-10-16T05:00:00Z'))).toEqual({
      state: 'closed',
      minutesToChange: 180,
    });
  });

  it('describes every exchange', () => {
    expect(EXCHANGES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(EXCHANGES.map((e) => e.id)).size).toBe(EXCHANGES.length);
    expect(exchangeById('nope')).toBeUndefined();
    for (const e of EXCHANGES) {
      expect(e.sessions.length).toBeGreaterThan(0);
      expect(() => marketStatus(e, at('2026-10-16T12:00:00Z'))).not.toThrow();
    }
  });
});
