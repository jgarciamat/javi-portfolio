/**
 * Trading hours of the main exchanges and the "open now" indicator.
 * Hours are the regular ones at the time of writing; exchange holidays and special
 * half-days are NOT included, and the exchanges can change their schedules.
 */

export interface Exchange {
  id: string;
  flag: string;
  name: string;
  city: string;
  /** IANA time zone of the exchange. */
  tz: string;
  /** Regular sessions as "HH:MM" pairs (two when there is a lunch break). */
  sessions: [string, string][];
  /** Pre-market and after-hours sessions offered by many brokers. */
  pre?: [string, string];
  after?: [string, string];
  /** Closing auction, opening auction or other detail worth knowing. */
  note: string;
  indices: string[];
}

export const MADRID_TZ = 'Europe/Madrid';

export const EXCHANGES: Exchange[] = [
  {
    id: 'nyse',
    flag: '🇺🇸',
    name: 'NYSE (Wall Street)',
    city: 'Nueva York',
    tz: 'America/New_York',
    sessions: [['09:30', '16:00']],
    pre: ['04:00', '09:30'],
    after: ['16:00', '20:00'],
    note: 'Subasta de apertura y de cierre. Es la bolsa más grande del mundo por capitalización.',
    indices: ['Dow Jones Industrial Average', 'S&P 500 (junto con el Nasdaq)'],
  },
  {
    id: 'nasdaq',
    flag: '🇺🇸',
    name: 'Nasdaq',
    city: 'Nueva York',
    tz: 'America/New_York',
    sessions: [['09:30', '16:00']],
    pre: ['04:00', '09:30'],
    after: ['16:00', '20:00'],
    note: 'Mercado totalmente electrónico, con muchas empresas tecnológicas.',
    indices: ['Nasdaq Composite', 'Nasdaq 100'],
  },
  {
    id: 'tsx',
    flag: '🇨🇦',
    name: 'Bolsa de Toronto (TSX)',
    city: 'Toronto',
    tz: 'America/Toronto',
    sessions: [['09:30', '16:00']],
    note: 'Muy cargada de bancos, energía y minería.',
    indices: ['S&P/TSX Composite'],
  },
  {
    id: 'lse',
    flag: '🇬🇧',
    name: 'Bolsa de Londres (LSE)',
    city: 'Londres',
    tz: 'Europe/London',
    sessions: [['08:00', '16:30']],
    note: 'Subasta de cierre de 16:30 a 16:35 aproximadamente.',
    indices: ['FTSE 100', 'FTSE 250'],
  },
  {
    id: 'xetra',
    flag: '🇩🇪',
    name: 'Bolsa de Fráncfort (Xetra)',
    city: 'Fráncfort',
    tz: 'Europe/Berlin',
    sessions: [['09:00', '17:30']],
    note: 'Subastas de apertura (a las 09:00) y de cierre (17:30).',
    indices: ['DAX 40', 'MDAX'],
  },
  {
    id: 'euronext-paris',
    flag: '🇫🇷',
    name: 'Euronext París',
    city: 'París',
    tz: 'Europe/Paris',
    sessions: [['09:00', '17:30']],
    note: 'Forma parte de Euronext, que agrupa también Ámsterdam, Bruselas, Lisboa, Milán y Dublín.',
    indices: ['CAC 40'],
  },
  {
    id: 'bme',
    flag: '🇪🇸',
    name: 'Bolsa de Madrid (BME)',
    city: 'Madrid',
    tz: 'Europe/Madrid',
    sessions: [['09:00', '17:30']],
    note: 'Subasta de apertura desde las 08:30 y subasta de cierre de 17:30 a 17:35.',
    indices: ['IBEX 35'],
  },
  {
    id: 'six',
    flag: '🇨🇭',
    name: 'Bolsa de Zúrich (SIX)',
    city: 'Zúrich',
    tz: 'Europe/Zurich',
    sessions: [['09:00', '17:30']],
    note: 'Sede de grandes empresas de alimentación, farma y banca.',
    indices: ['SMI'],
  },
  {
    id: 'sse',
    flag: '🇨🇳',
    name: 'Bolsa de Shanghái (SSE)',
    city: 'Shanghái',
    tz: 'Asia/Shanghai',
    sessions: [
      ['09:30', '11:30'],
      ['13:00', '15:00'],
    ],
    note: 'Pausa de mediodía. Shenzhen (SZSE) tiene el mismo horario. Acceso limitado para extranjeros.',
    indices: ['SSE Composite', 'CSI 300 (Shanghái y Shenzhen)'],
  },
  {
    id: 'hkex',
    flag: '🇭🇰',
    name: 'Bolsa de Hong Kong (HKEX)',
    city: 'Hong Kong',
    tz: 'Asia/Hong_Kong',
    sessions: [
      ['09:30', '12:00'],
      ['13:00', '16:00'],
    ],
    note: 'Puerta de entrada a las empresas chinas. HKEX ha estudiado cambios en su pausa de mediodía: comprueba su web.',
    indices: ['Hang Seng'],
  },
  {
    id: 'tse',
    flag: '🇯🇵',
    name: 'Bolsa de Tokio (TSE)',
    city: 'Tokio',
    tz: 'Asia/Tokyo',
    sessions: [
      ['09:00', '11:30'],
      ['12:30', '15:30'],
    ],
    note: 'Cierra a las 15:30 desde noviembre de 2024 (antes, a las 15:00).',
    indices: ['Nikkei 225', 'TOPIX'],
  },
  {
    id: 'krx',
    flag: '🇰🇷',
    name: 'Bolsa de Corea (KRX)',
    city: 'Seúl',
    tz: 'Asia/Seoul',
    sessions: [['09:00', '15:30']],
    note: 'Muy marcada por los semiconductores.',
    indices: ['KOSPI'],
  },
  {
    id: 'nse',
    flag: '🇮🇳',
    name: 'Bolsa Nacional de la India (NSE)',
    city: 'Bombay',
    tz: 'Asia/Kolkata',
    sessions: [['09:15', '15:30']],
    note: 'Su hora es UTC+5:30 todo el año, sin cambio de horario.',
    indices: ['Nifty 50', 'Sensex (BSE)'],
  },
  {
    id: 'asx',
    flag: '🇦🇺',
    name: 'Bolsa de Australia (ASX)',
    city: 'Sídney',
    tz: 'Australia/Sydney',
    sessions: [['10:00', '16:00']],
    note: 'La apertura se escalona por letras en los primeros minutos. Cambia de hora en el hemisferio sur.',
    indices: ['S&P/ASX 200'],
  },
];

export const exchangeById = (id: string): Exchange | undefined =>
  EXCHANGES.find((e) => e.id === id);

/** "09:30" -> 570 minutes since midnight. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function formatMinutes(total: number): string {
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

interface LocalTime {
  weekday: number;
  minutes: number;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Day of the week (0 = Sunday) and minutes since midnight at `tz` for an instant. */
export function localTime(now: Date, tz: string): LocalTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) =>
    (parts.find((p) => p.type === type) as Intl.DateTimeFormatPart).value;
  return {
    weekday: WEEKDAYS[get('weekday')],
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
  };
}

/** Offset of `tz` from UTC in minutes at the given instant (DST included). */
export function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    n('year'),
    n('month') - 1,
    n('day'),
    n('hour') % 24,
    n('minute'),
    n('second')
  );
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

export interface SpanishTime {
  text: string;
  /** -1 the day before, 0 the same day, 1 the next day (in Spain). */
  dayShift: number;
}

/** Converts an exchange's local clock time to Spanish time on the day of `at`. */
export function toSpanishTime(hhmm: string, tz: string, at: Date): SpanishTime {
  const diff = tzOffsetMinutes(MADRID_TZ, at) - tzOffsetMinutes(tz, at);
  const total = toMinutes(hhmm) + diff;
  return { text: formatMinutes(total), dayShift: Math.floor(total / 1440) };
}

export type MarketState = 'open' | 'break' | 'pre' | 'after' | 'closed';

export interface MarketStatus {
  state: MarketState;
  /** Minutes until the state changes today (null when it will not change before midnight). */
  minutesToChange: number | null;
}

/** Whether an exchange is trading at `now`, from its static schedule (no holidays). */
export function marketStatus(exchange: Exchange, now: Date): MarketStatus {
  const { weekday, minutes } = localTime(now, exchange.tz);
  if (weekday === 0 || weekday === 6) return { state: 'closed', minutesToChange: null };

  const segments: { state: MarketState; start: number; end: number }[] = [];
  if (exchange.pre) segments.push(range('pre', exchange.pre));
  exchange.sessions.forEach((s) => segments.push(range('open', s)));
  if (exchange.after) segments.push(range('after', exchange.after));

  const current = segments.find((s) => minutes >= s.start && minutes < s.end);
  if (current) return { state: current.state, minutesToChange: current.end - minutes };

  const next = segments.find((s) => s.start > minutes);
  const firstOpen = toMinutes(exchange.sessions[0][0]);
  const lastOpen = toMinutes(exchange.sessions[exchange.sessions.length - 1][1]);
  const inBreak = minutes > firstOpen && minutes < lastOpen;
  return {
    state: inBreak ? 'break' : 'closed',
    minutesToChange: next ? next.start - minutes : null,
  };
}

function range(state: MarketState, [from, to]: [string, string]) {
  return { state, start: toMinutes(from), end: toMinutes(to) };
}

/** "1 h 05 min" style duration from a number of minutes. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}
