import type { ReferralSummary } from '@modules/billing/domain/types';
import { lastSeason } from './season';
import type { CryptoRanking, SimPortfolio } from './types';

/**
 * «Invite a friend» inside the console: one short notice after something good (a trade closed
 * with a net gain, a place in the ranking, the summary of a finished season), at most once every
 * 7 days on this device, and never once the person has invited someone.
 */
export const NUDGE_KEY = 'mm_crypto_invite_nudge';
export const NUDGE_EVERY_MS = 7 * 24 * 60 * 60 * 1000;
/** Events remembered as used (seasons add one a month): the oldest ones are forgotten. */
const DONE_MAX = 24;

/** `win`, `ranking` or `season:YYYY-MM` (one per finished season). */
export type NudgeTrigger = string;

export interface NudgeMemory {
  /** When the last notice was shown (ms), `null` before the first one. */
  at: number | null;
  /** Events already used, shown or skipped: each one counts once. */
  done: NudgeTrigger[];
  /** The notice on screen until the person closes it (or uses its link). */
  open: NudgeTrigger | null;
}

export const EMPTY_NUDGE: NudgeMemory = { at: null, done: [], open: null };

/** What was saved on this device, or nothing when it is missing or not ours. */
export function readNudge(saved: unknown): NudgeMemory {
  if (!saved || typeof saved !== 'object') return EMPTY_NUDGE;
  const { at, done, open } = saved as Record<string, unknown>;
  return {
    at: typeof at === 'number' && Number.isFinite(at) ? at : null,
    done: Array.isArray(done) ? done.filter((d): d is string => typeof d === 'string') : [],
    open: typeof open === 'string' ? open : null,
  };
}

/** The person has already invited someone (finished or on the way): no more notices. */
export const invitedSomeone = (r: ReferralSummary): boolean => r.qualified + r.pending > 0;

/** The kind of a trigger, for its texts: `season:2026-02` → `season`. */
export const nudgeKind = (trigger: NudgeTrigger) => trigger.split(':')[0];

/**
 * The good moments there are now, most recent first: the summary of the season that just ended
 * (while it is on screen), a place in the ranking and a trade closed with a net gain.
 */
export function nudgeTriggers(
  portfolio: SimPortfolio,
  ranking: CryptoRanking | null,
  summarySeen: string | null
): NudgeTrigger[] {
  const triggers: NudgeTrigger[] = [];
  const last = lastSeason(portfolio);
  if (last && summarySeen !== last.season) triggers.push(`season:${last.season}`);
  if (ranking?.me.place) triggers.push('ranking');
  if (portfolio.closed.some((c) => c.pnl > 0)) triggers.push('win');
  return triggers;
}

/**
 * The notice to show and what to remember. The one on screen stays until closed (for 7 days at
 * most); a new event shows only when the last notice is 7 days old, and otherwise is used up
 * without a notice, so nothing old comes back later.
 */
export function nextNudge(
  memory: NudgeMemory,
  triggers: NudgeTrigger[],
  now: number
): { memory: NudgeMemory; open: NudgeTrigger | null } {
  const rested = memory.at === null || now - memory.at >= NUDGE_EVERY_MS;
  if (memory.open && !rested) return { memory, open: memory.open };
  const fresh = triggers.filter((t) => !memory.done.includes(t));
  if (!fresh.length) return { memory: { ...memory, open: null }, open: null };
  const done = [...memory.done, ...fresh].slice(-DONE_MAX);
  if (!rested) return { memory: { ...memory, done, open: null }, open: null };
  return { memory: { at: now, done, open: fresh[0] }, open: fresh[0] };
}
