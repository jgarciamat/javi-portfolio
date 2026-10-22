/**
 * Monthly seasons, the ranking (everybody is in, with an alias) and the light badges of the
 * crypto console (docs/consola-crypto.md). Pure functions: play money only, no prizes in money.
 *
 * Every season is a calendar month in Spain: it starts on the 1st at 00:00 (Europe/Madrid) with
 * 10.000 € of play money for everybody and is never topped up in the middle.
 */

const MADRID = 'Europe/Madrid';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Play money every season starts with (cents): the same for the free plan and Premium. */
export const SEASON_INITIAL_CENTS = 1_000_000;
/** Practice portfolios: separate, never ranked, start again with this. */
export const PRACTICE_INITIAL_CENTS = 1_000_000;
/** Practice portfolios at once: one on the free plan, five with Premium. */
export const PRACTICE_MAX = { free: 1, premium: 5 } as const;
/** Pending orders per portfolio: a convenience, it does not change the results. */
export const PENDING_MAX = { free: 20, premium: 100 } as const;
/** Price alerts waiting at once (Premium). */
export const ALERTS_MAX = 10;
/** New or restarted practice portfolios per day (Madrid), so nobody floods the server. */
export const PRACTICE_ACTIONS_PER_DAY = 5;
/** Places of the ranking shown (and kept every month). */
export const RANKING_SIZE = 5;
/** To be ranked: at least this many operations closed and days with activity in the month. */
export const RANKING_MIN_TRADES = 5;
export const RANKING_MIN_DAYS = 3;
/** The prize of the winner: Premium days (one month), never money. */
export const PRIZE_DAYS = 30;
/** Operations of a finished season are kept this many months, then deleted. */
export const SEASON_HISTORY_MONTHS = 12;
/** Days before the end when the console warns that a new season is coming. */
export const SEASON_WARNING_DAYS = 3;

export const BADGES = ['firstTrade', 'firstTakeProfit', 'tenTrades', 'positiveMonth'] as const;
export type BadgeId = (typeof BADGES)[number];

function madridParts(at: number): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MADRID,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(at));
  const out: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') out[p.type] = Number(p.value);
  return out;
}

/** Calendar month in Spain (YYYY-MM) of an instant: the season it belongs to. */
export function madridMonth(at: Date | number): string {
  const p = madridParts(typeof at === 'number' ? at : at.getTime());
  return `${p.year}-${String(p.month).padStart(2, '0')}`;
}

/** Calendar day in Spain (YYYY-MM-DD) of an instant. */
export function madridDay(at: Date | number | string): string {
  const ms = typeof at === 'string' ? Date.parse(at) : typeof at === 'number' ? at : at.getTime();
  const p = madridParts(ms);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** How far ahead of UTC Madrid is at an instant (ms: one or two hours). */
function madridOffset(at: number): number {
  const p = madridParts(at);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(at / 1000) * 1000;
}

/** The instant a month starts in Spain (its 1st at 00:00, Madrid time). */
export function monthStartsAt(month: string): Date {
  const [year, m] = month.split('-').map(Number);
  const guess = Date.UTC(year, m - 1, 1);
  const first = guess - madridOffset(guess);
  return new Date(guess - madridOffset(first));
}

export function nextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`;
}

export function previousMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, '0')}`;
}

/** The month `count` months before `month`. */
export function monthsBefore(month: string, count: number): string {
  let out = month;
  for (let i = 0; i < count; i++) out = previousMonth(out);
  return out;
}

/** The instant a season ends (the next one starts). */
export const seasonEndsAt = (month: string): Date => monthStartsAt(nextMonth(month));

/** Whole days left until the next season (0 on the last day). */
export function daysLeft(month: string, now: Date): number {
  const ms = seasonEndsAt(month).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / DAY_MS) - 1);
}

/** Return of a season (%, two decimals): final equity over the initial play money, minus 1. */
export function returnPercent(finalCents: number, initialCents: number): number {
  return Math.round((finalCents / initialCents - 1) * 10_000) / 100;
}

export interface SeasonEntry {
  /** Opaque, never shown: only to break the very last tie in a stable way. */
  key: string;
  finalCents: number;
  initialCents: number;
  /** Operations closed in the season (not the ones closed by its end). */
  trades: number;
  /** Days (Madrid) with an operation opened or closed. */
  activeDays: number;
  /** When the last operation was closed: the earliest reached the result first. */
  reachedAt: string | null;
}

/** What is still missing to be ranked (zeros when it qualifies). */
export function missing(entry: Pick<SeasonEntry, 'trades' | 'activeDays'>): {
  trades: number;
  days: number;
} {
  return {
    trades: Math.max(0, RANKING_MIN_TRADES - entry.trades),
    days: Math.max(0, RANKING_MIN_DAYS - entry.activeDays),
  };
}

export const qualifies = (entry: Pick<SeasonEntry, 'trades' | 'activeDays'>): boolean => {
  const m = missing(entry);
  return m.trades === 0 && m.days === 0;
};

/**
 * Order of the ranking: higher return; on a tie, more operations; then whoever reached it first
 * (earlier last closed operation); finally a stable key so the order never changes.
 */
export function compareEntries(a: SeasonEntry, b: SeasonEntry): number {
  const ra = a.finalCents / a.initialCents;
  const rb = b.finalCents / b.initialCents;
  if (ra !== rb) return rb - ra;
  if (a.trades !== b.trades) return b.trades - a.trades;
  const ta = a.reachedAt ? Date.parse(a.reachedAt) : Infinity;
  const tb = b.reachedAt ? Date.parse(b.reachedAt) : Infinity;
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/** The qualified entries in ranking order. */
export function rank<T extends SeasonEntry>(entries: T[]): T[] {
  return entries.filter(qualifies).sort(compareEntries);
}

/** Counts of a season from its operations: closed ones (not by the season end) and active days. */
export function activity(
  positions: { openedAt: string; closedAt: string | null; closeType: string | null }[]
): { trades: number; activeDays: number; reachedAt: string | null } {
  const days = new Set<string>();
  let trades = 0;
  let reachedAt: string | null = null;
  for (const p of positions) {
    days.add(madridDay(p.openedAt));
    if (p.closedAt && p.closeType !== 'season') {
      trades += 1;
      days.add(madridDay(p.closedAt));
      if (!reachedAt || p.closedAt > reachedAt) reachedAt = p.closedAt;
    }
  }
  return { trades, activeDays: days.size, reachedAt };
}

// ─── Alias ──────────────────────────────────────────────────────────────────

export const ALIAS_MIN = 3;
export const ALIAS_MAX = 20;

/** Basic words never accepted in an alias (Spanish and English, lower case, no accents). */
const BLOCKED = [
  'puta',
  'puto',
  'mierda',
  'polla',
  'cono',
  'joder',
  'cabron',
  'gilipollas',
  'maricon',
  'zorra',
  'follar',
  'nazi',
  'hitler',
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'dick',
  'nigger',
  'nigga',
  'whore',
  'porn',
  'porno',
  'sexo',
  'admin',
  'finanverso',
];

const plain = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's');

export type AliasProblem = 'length' | 'characters' | 'contact' | 'words';

/** Trims and joins spaces; the alias as it will be shown. */
export const cleanAlias = (alias: string): string =>
  alias.normalize('NFC').trim().replace(/\s+/g, ' ');

/** Why an alias is not accepted, or null when it is fine. */
export function aliasProblem(alias: string): AliasProblem | null {
  const clean = cleanAlias(alias);
  if ([...clean].length < ALIAS_MIN || [...clean].length > ALIAS_MAX) return 'length';
  if (/[@]|https?:|www\.|\.(com|es|net|org|io|app|me|info)\b|:\/\//i.test(clean)) return 'contact';
  if (/\d{6,}/.test(clean.replace(/\s/g, ''))) return 'contact';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(clean)) return 'characters';
  // Long words anywhere (also joined with others); short ones only as a whole word, so that
  // «Economista» or «Dickens» are fine.
  const flat = plain(clean);
  const words = clean.split(/[\s._-]+/).map(plain);
  if (BLOCKED.some((w) => (w.length >= 5 ? flat.includes(w) : words.includes(w)))) {
    return 'words';
  }
  return null;
}

/** The alias proposed the first time: the first name of the profile, when it is a valid alias. */
export function suggestedAlias(name: string): string | null {
  const first = cleanAlias(name).split(' ')[0] ?? '';
  const candidate = [...first].slice(0, ALIAS_MAX).join('');
  return candidate && aliasProblem(candidate) === null ? candidate : null;
}

/**
 * «Jugador4821»: the alias of someone whose first name cannot be one. The four digits come from
 * the user id, so they look random but never change (and say nothing about the person).
 */
export function playerAlias(userId: string): string {
  const hash = [...userId].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9000, 7);
  return `Jugador${1000 + hash}`;
}

/**
 * The alias shown in the ranking: the one the person chose, else the first name of the profile,
 * else «Jugador» and four digits. Everybody with an official season appears with it.
 */
export function rankingAlias(chosen: string | null, name: string, userId: string): string {
  return chosen ?? suggestedAlias(name) ?? playerAlias(userId);
}
