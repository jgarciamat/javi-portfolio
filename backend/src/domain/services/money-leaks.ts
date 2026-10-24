import { createHash } from 'crypto';
import { cleanPattern } from '@domain/services/category-rules';
import { Cents } from '@domain/shared/money';
import { normalizeText } from '@domain/shared/text';

/**
 * «Tu dinero perdido» (docs/disenos/dinero-perdido-y-fecha-meta.md, section C): what the user's
 * own movements show that is worth checking. Charges that repeat, price rises, possible double
 * charges and small purchases made very often at the same place. Deterministic and pure: the
 * same movements, decisions and day always give the same result, and nothing here is stored.
 * Only the user's decisions are kept (table `money_leak_decisions`).
 */

export type LeakKind = 'recurring' | 'increase' | 'duplicate' | 'small';
export type LeakCadence = 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';
export type LeakConfidence = 'high' | 'medium' | 'low';
/** What the user decided about a finding. `recovered` is set by the server, never by the user. */
export type LeakDecisionStatus = 'keep' | 'cancel' | 'dismissed' | 'not_mine' | 'recovered';
export type LeakStatus = 'new' | LeakDecisionStatus | 'refunded';
export type CoverageLevel = 'none' | 'partial' | 'complete';

export interface LeakMovement {
  description: string;
  amountCents: Cents;
  /** YYYY-MM-DD */
  date: string;
  type: string;
  categoryName: string;
  recurringRuleId: string | null;
}

export interface LeakDecision {
  findingId: string;
  fingerprint: string;
  kind: LeakKind;
  status: LeakDecisionStatus;
  /** Yearly cost when it was decided, for «you stop paying…». */
  annualCents: Cents;
  decidedAt: string;
  recoveredAt: string | null;
}

export interface LeakEvidence {
  date: string;
  amountCents: Cents;
}

export interface LeakFinding {
  /** sha256 of the fingerprint, 16 hex: no merchant name ever travels in a URL. */
  id: string;
  fingerprint: string;
  kind: LeakKind;
  confidence: LeakConfidence;
  status: LeakStatus;
  /** Description of the latest charge, as the bank wrote it. */
  label: string;
  /** Rent, power, loans, insurance, taxes or a transfer: never counted as money to check. */
  essential: boolean;
  cadence: LeakCadence | null;
  /** Latest charge / the charge seen twice / the average small purchase. */
  amountCents: Cents;
  /** Price before a rise (rises and repeating charges that went up). */
  previousAmountCents: Cents | null;
  /** Yearly cost (0 for double charges). */
  annualCents: Cents;
  /** One-off amount (double charges only). */
  oneOffCents: Cents;
  count: number;
  firstDate: string;
  lastDate: string;
  nextDate: string | null;
  /** Small purchases per month (small spending only). */
  perMonth: number | null;
  /** Newest first, at most EVIDENCE_LIMIT. */
  evidence: LeakEvidence[];
  /** Still being charged (repeating charges); a stopped one only matters for a «cancel». */
  active: boolean;
  /** Order of the list: higher first. */
  priority: number;
}

export interface LeakCoverage {
  level: CoverageLevel;
  from: string | null;
  to: string | null;
  days: number;
  movements: number;
  /** Enough history (13 months) for yearly charges. */
  yearlyReady: boolean;
}

export interface LeakReport {
  coverage: LeakCoverage;
  /** Shown findings (high and medium confidence), new ones by priority then the reviewed ones. */
  findings: LeakFinding[];
}

export interface LeakTotals {
  /** Rounded down to tens, as shown («about 870 € a year»). */
  annualCents: Cents;
  /** Possible double charges still to check, rounded down to whole euros. */
  oneOffCents: Cents;
  /** Findings that add to the yearly figure. */
  count: number;
}

export interface LeakSummary {
  total: LeakTotals;
  byKind: Record<LeakKind, { count: number; annualCents: Cents }>;
  /** Findings still to check. */
  count: number;
  reviewed: { count: number; cancelMonthlyCents: Cents; recoveredAnnualCents: Cents };
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Months of movements looked at. */
export const LEAK_WINDOW_MONTHS = 25;
/** Most recent rows read, so a huge history cannot block the server. */
export const LEAK_MAX_ROWS = 20_000;
export const EVIDENCE_LIMIT = 24;
/** Coverage needed for the full analysis. */
export const COMPLETE_DAYS = 90;
export const COMPLETE_MOVEMENTS = 30;
const YEARLY_READY_DAYS = 395;

interface CadenceRule {
  min: number;
  max: number;
  charges: number;
  /** How long after the last charge it is still being charged. */
  activeDays: number;
  perYear: number;
  /** Usual gap, for the next expected charge. */
  days: number;
  /** Days after the next expected charge without a charge before a cancellation counts. */
  margin: number;
}

/** Docs C.2. Banks move charges for weekends and February: monthly accepts 24 to 37 days. */
export const CADENCES: Record<LeakCadence, CadenceRule> = {
  weekly: { min: 6, max: 8, charges: 5, activeDays: 16, perYear: 52, days: 7, margin: 3 },
  monthly: { min: 24, max: 37, charges: 3, activeDays: 65, perYear: 12, days: 30, margin: 10 },
  bimonthly: { min: 55, max: 66, charges: 3, activeDays: 125, perYear: 6, days: 61, margin: 15 },
  quarterly: { min: 85, max: 97, charges: 3, activeDays: 190, perYear: 4, days: 91, margin: 20 },
  yearly: { min: 350, max: 380, charges: 2, activeDays: 400, perYear: 1, days: 365, margin: 30 },
};
const CADENCE_ORDER: LeakCadence[] = ['weekly', 'monthly', 'bimonthly', 'quarterly', 'yearly'];

/** Charges further than this from the median are not the same service. */
const AMOUNT_TOLERANCE = 0.25;
/** Steady enough for high confidence. */
const STEADY_TOLERANCE = 0.05;
/** A rise counts from 3 % and 0,50 € on (rounding noise is ignored). */
const INCREASE_PERCENT = 103;
const INCREASE_MIN_CENTS = 50;
/** Charges within 2 % of each other are the same price. */
const SAME_PRICE = 0.02;
const DUPLICATE_MIN_CENTS = 1000;
const DUPLICATE_MAX_DAYS = 2;
const REFUND_DAYS = 45;
/** Same amount this many times in 30 days: a frequent purchase (metro, parking, coffee). */
const FREQUENT_SAME_AMOUNT = 4;
const SMALL_MAX_CENTS = 1200;
const SMALL_DAYS = 90;
const SMALL_MIN_DAYS = 45;
const SMALL_MIN_COUNT = 12;
const SMALL_MIN_ANNUAL_CENTS = 12_000;

/** Default categories that are not money to check: paying the power bill is not a leak. */
const ESSENTIAL_CATEGORIES = new Set([
  'vivienda',
  'luz',
  'agua',
  'gas',
  'salud',
  'educacion',
  'nino',
]);
const ESSENTIAL_WORDS = ['prestamo', 'hipoteca', 'comunidad', 'seguro', 'impuesto', 'ayuntamiento'];
/**
 * The app files gyms under «Salud» (see categorizer.ts), but a gym fee is the classic charge
 * worth checking: these words are never essential by their category.
 */
const NOT_ESSENTIAL_WORDS = ['gimnasio', 'gym', 'fitness', 'crossfit', 'pilates', 'yoga'];
/** Paying a person (your share of the flat) is not a subscription. */
const TRANSFER_WORDS = ['bizum', 'transferencia'];
/** The weekly shop and the travel pass are not small leaks either. */
const EVERYDAY_CATEGORIES = new Set(['alimentacion', 'transporte']);

/** Card and bank noise around the merchant's name (docs C.1). */
const NOISE = new Set([
  'compra',
  'pago',
  'tarj',
  'tarjeta',
  'recibo',
  'adeudo',
  'bizum',
  'com',
  'domiciliacion',
  'cargo',
  'cuota',
  'transaccion',
  'contactless',
  'paypal',
  'www',
  'es',
  'sl',
  'sa',
  'sociedad',
  'oficina',
  // Refunds, so a refund falls in the group of the charge it gives back.
  'devolucion',
  'abono',
  'reembolso',
  'anulacion',
]);
/** Payment firms that put their name before the real merchant. */
const INTERMEDIARIES = new Set(['paypal', 'sumup', 'zettle', 'stripe']);
/** A city at the end of the description is not part of the name. */
const PROVINCES = new Set([
  'madrid',
  'barcelona',
  'valencia',
  'sevilla',
  'malaga',
  'zaragoza',
  'bilbao',
  'alicante',
  'murcia',
  'palma',
  'coruna',
  'granada',
  'valladolid',
  'cordoba',
  'vigo',
]);

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

function addDays(date: string, days: number): string {
  return new Date((dayNumber(date) + days) * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** First day of the window: `months` before `today`. */
export function windowStart(today: string, months = LEAK_WINDOW_MONTHS): string {
  const [y, m, d] = today.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1 - months, 1));
  const last = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(d, last));
  return start.toISOString().slice(0, 10);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const letters = (text: string): number => text.replace(/[^a-z]/g, '').length;

/**
 * The merchant a bank description belongs to, so «COMPRA TARJ. 5402 STREAMFLIX.COM 28/09»,
 * «STREAMFLIX.COM» and «PAYPAL *STREAMFLIX» fall in the same group. A pinned category rule of
 * the user wins (they already told us the merchant's name). Null when too little is left.
 */
export function merchantKey(description: string, aliases: readonly string[] = []): string | null {
  const text = cleanPattern(description);
  let alias: string | null = null;
  for (const pattern of aliases) {
    if (letters(pattern) >= 3 && text.includes(pattern) && pattern.length > (alias?.length ?? 0)) {
      alias = pattern;
    }
  }
  if (alias) return alias;
  const words = normalizeText(description)
    .replace(/\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?/g, ' ')
    .replace(/\b(apple|google) pay\b/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !/\d/.test(w) && !NOISE.has(w));
  while (words.length && INTERMEDIARIES.has(words[0])) words.shift();
  if (words.length > 1 && PROVINCES.has(words[words.length - 1])) words.pop();
  const key = words.slice(0, 3).join(' ');
  return letters(key) >= 3 ? key : null;
}

function isEssential(description: string, categoryName: string): boolean {
  const text = normalizeText(description);
  const byCategory =
    ESSENTIAL_CATEGORIES.has(normalizeText(categoryName)) &&
    !NOT_ESSENTIAL_WORDS.some((w) => text.includes(w));
  return byCategory || ESSENTIAL_WORDS.some((w) => text.includes(w)) || isTransfer(description);
}

function isTransfer(description: string): boolean {
  const text = normalizeText(description);
  return TRANSFER_WORDS.some((w) => text.includes(w));
}

/** Public id of a finding: sha256 of its fingerprint, 16 hex characters. */
export function findingId(fingerprint: string): string {
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 16);
}

function evidenceOf(charges: { date: string; amountCents: Cents }[]): LeakEvidence[] {
  return [...charges]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, EVIDENCE_LIMIT)
    .map(({ date, amountCents }) => ({ date, amountCents }));
}

/** Days of expenses in the window and how many there are (docs C.9). */
export function coverageOf(expenses: { date: string }[]): LeakCoverage {
  if (expenses.length === 0) {
    return { level: 'none', from: null, to: null, days: 0, movements: 0, yearlyReady: false };
  }
  const dates = expenses.map((e) => e.date).sort();
  const from = dates[0];
  const to = dates[dates.length - 1];
  const days = daysBetween(from, to) + 1;
  const complete = days >= COMPLETE_DAYS && expenses.length >= COMPLETE_MOVEMENTS;
  return {
    level: complete ? 'complete' : 'partial',
    from,
    to,
    days,
    movements: expenses.length,
    yearlyReady: days >= YEARLY_READY_DAYS,
  };
}

interface Charge {
  description: string;
  amountCents: Cents;
  date: string;
  categoryName: string;
}

interface Group {
  key: string;
  charges: Charge[];
  essential: boolean;
  /** Food or transport: everyday spending, not a service. */
  everyday: boolean;
}

/** Amount blocks more than 25 % apart: two plans of the same shop are two services. */
function splitByAmount(charges: Charge[]): Charge[][] {
  const sorted = [...charges].sort((a, b) => a.amountCents - b.amountCents);
  const blocks: Charge[][] = [];
  for (const charge of sorted) {
    const block = blocks[blocks.length - 1];
    const last = block?.[block.length - 1];
    if (last && charge.amountCents <= last.amountCents * (1 + AMOUNT_TOLERANCE)) block.push(charge);
    else blocks.push([charge]);
  }
  return blocks.map((b) => b.sort((x, y) => x.date.localeCompare(y.date)));
}

/** The rhythm of a block of charges, and whether one missed charge had to be tolerated. */
export function cadenceOf(dates: string[]): { cadence: LeakCadence; tolerated: boolean } | null {
  const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i], d));
  for (const cadence of CADENCE_ORDER) {
    const { min, max, charges } = CADENCES[cadence];
    if (dates.length < charges) continue;
    const out = gaps.filter((g) => g < min || g > max);
    if (out.length === 0) return { cadence, tolerated: false };
    // With five charges or more, one gap of about twice the rhythm (a month without charge).
    if (dates.length >= 5 && out.length === 1 && out[0] >= min * 2 && out[0] <= max * 2) {
      return { cadence, tolerated: true };
    }
  }
  return null;
}

interface RepeatingBlock {
  group: Group;
  block: number;
  charges: Charge[];
  cadence: LeakCadence;
  tolerated: boolean;
}

/** The price before the latest change, when the latest charge is a real rise (docs C.3). */
function priceRise(
  charges: Charge[]
): { fromCents: Cents; toCents: Cents; confidence: LeakConfidence } | null {
  const toCents = charges[charges.length - 1].amountCents;
  let k = charges.length - 1;
  while (k > 0 && charges[k - 1].amountCents === toCents) k--;
  if (k === 0) return null;
  const before = charges[k - 1].amountCents;
  const run: Cents[] = [];
  for (let i = k - 1; i >= 0; i--) {
    if (Math.abs(charges[i].amountCents - before) > before * SAME_PRICE) break;
    run.push(charges[i].amountCents);
  }
  const fromCents = Math.round(median(run));
  if (toCents * 100 < fromCents * INCREASE_PERCENT || toCents - fromCents < INCREASE_MIN_CENTS) {
    return null;
  }
  // Two charges at the old price, or one before and one after (typical of yearly ones).
  const confidence: LeakConfidence = run.length >= 2 ? 'high' : k === 1 ? 'medium' : 'low';
  return { fromCents, toCents, confidence };
}

function baseFinding(
  fingerprint: string,
  kind: LeakKind,
  label: string,
  charges: { date: string; amountCents: Cents }[]
): Pick<
  LeakFinding,
  'id' | 'fingerprint' | 'kind' | 'label' | 'count' | 'firstDate' | 'lastDate' | 'evidence'
> {
  return {
    id: findingId(fingerprint),
    fingerprint,
    kind,
    label,
    count: charges.length,
    firstDate: charges[0].date,
    lastDate: charges[charges.length - 1].date,
    evidence: evidenceOf(charges),
  };
}

function repeatingFindings(blocks: RepeatingBlock[], today: string): LeakFinding[] {
  const found: LeakFinding[] = [];
  for (const { group, block, charges, cadence, tolerated } of blocks) {
    const rule = CADENCES[cadence];
    const latest = charges[charges.length - 1];
    const active = daysBetween(latest.date, today) <= rule.activeDays;
    const rise = priceRise(charges);
    const nextDate = addDays(latest.date, rule.days);
    if (rise && rise.confidence !== 'low' && active) {
      const fingerprint = `inc:${group.key}:${rise.toCents}`;
      found.push({
        ...baseFinding(fingerprint, 'increase', latest.description, charges),
        confidence: rise.confidence,
        status: 'new',
        essential: group.essential,
        cadence,
        amountCents: rise.toCents,
        previousAmountCents: rise.fromCents,
        annualCents: (rise.toCents - rise.fromCents) * rule.perYear,
        oneOffCents: 0,
        nextDate,
        perMonth: null,
        active,
        priority: (rise.toCents - rise.fromCents) * rule.perYear,
      });
    }
    if (group.essential) continue;
    const mid = median(charges.map((c) => c.amountCents));
    const steady = charges.every((c) => Math.abs(c.amountCents - mid) <= mid * STEADY_TOLERANCE);
    const few = cadence === 'monthly' || cadence === 'weekly' ? 4 : 3;
    let confidence: LeakConfidence =
      charges.length >= few && !tolerated && steady ? 'high' : 'medium';
    if (cadence === 'yearly' && !steady) confidence = 'low';
    const annualCents = latest.amountCents * rule.perYear;
    const age = daysBetween(charges[0].date, today);
    const monthly = annualCents / 12;
    // What tends to go unnoticed: old, cheap and with no other spending at the same place.
    const weight =
      1 +
      (age >= 180 ? 0.25 : 0) +
      (monthly <= 1500 ? 0.25 : 0) +
      (group.charges.length === charges.length ? 0.25 : 0);
    const fingerprint = `rec:${group.key}:${cadence}:${block}`;
    found.push({
      ...baseFinding(fingerprint, 'recurring', latest.description, charges),
      confidence,
      status: 'new',
      essential: false,
      cadence,
      amountCents: latest.amountCents,
      previousAmountCents: rise && rise.confidence !== 'low' ? rise.fromCents : null,
      annualCents,
      oneOffCents: 0,
      nextDate,
      perMonth: null,
      active,
      priority: Math.round(annualCents * weight),
    });
  }
  return found;
}

/** Possible double charges: same merchant and amount (≥ 10 €), 0 to 2 days apart (docs C.4). */
function duplicateFindings(groups: Group[], refunds: Map<string, Charge[]>): LeakFinding[] {
  const found: LeakFinding[] = [];
  for (const group of groups) {
    const charges = group.charges;
    const usual = new Map<Cents, boolean>();
    /** Bought often at that price (metro, parking) or a usual essential amount: not a mistake. */
    const isUsual = (amountCents: Cents): boolean => {
      if (!usual.has(amountCents)) {
        const dates = charges.filter((c) => c.amountCents === amountCents).map((c) => c.date);
        const last = FREQUENT_SAME_AMOUNT - 1;
        const frequent = dates.some(
          (d, i) => i + last < dates.length && daysBetween(d, dates[i + last]) < 30
        );
        usual.set(amountCents, frequent || (group.essential && dates.length >= 3));
      }
      return usual.get(amountCents) as boolean;
    };
    const used = new Set<number>();
    for (let i = 0; i < charges.length; i++) {
      const a = charges[i];
      if (used.has(i) || a.amountCents < DUPLICATE_MIN_CENTS) continue;
      let j = -1;
      for (let n = i + 1; n < charges.length; n++) {
        if (daysBetween(a.date, charges[n].date) > DUPLICATE_MAX_DAYS) break;
        if (!used.has(n) && charges[n].amountCents === a.amountCents) {
          j = n;
          break;
        }
      }
      if (j < 0 || isUsual(a.amountCents)) continue;
      used.add(i).add(j);
      const b = charges[j];
      const refunded = (refunds.get(group.key) ?? []).some((r) => {
        const gap = daysBetween(b.date, r.date);
        return r.amountCents === a.amountCents && gap >= 0 && gap <= REFUND_DAYS;
      });
      const fingerprint = `dup:${group.key}:${a.amountCents}:${a.date}`;
      found.push({
        ...baseFinding(fingerprint, 'duplicate', b.description, [a, b]),
        confidence: a.date === b.date ? 'high' : 'medium',
        status: refunded ? 'refunded' : 'new',
        essential: group.essential,
        cadence: null,
        amountCents: a.amountCents,
        previousAmountCents: null,
        annualCents: 0,
        oneOffCents: a.amountCents,
        nextDate: null,
        perMonth: null,
        active: true,
        priority: a.amountCents,
      });
    }
  }
  return found;
}

/** Small purchases (≤ 12 €) made very often at the same place (docs C.5). */
function smallFindings(
  groups: Group[],
  today: string,
  firstExpense: string,
  repeating: ReadonlySet<string>
): LeakFinding[] {
  const since = addDays(today, -SMALL_DAYS);
  const days = Math.min(SMALL_DAYS, daysBetween(firstExpense, today));
  if (days < SMALL_MIN_DAYS) return [];
  const found: LeakFinding[] = [];
  for (const group of groups) {
    if (group.essential || group.everyday || repeating.has(group.key)) continue;
    const small = group.charges.filter((c) => c.date > since && c.amountCents <= SMALL_MAX_CENTS);
    if (small.length < SMALL_MIN_COUNT) continue;
    const total = small.reduce((s, c) => s + c.amountCents, 0);
    const annualCents = Math.floor((total * 365) / days / 1000) * 1000;
    if (annualCents < SMALL_MIN_ANNUAL_CENTS) continue;
    const fingerprint = `ant:${group.key}`;
    found.push({
      ...baseFinding(fingerprint, 'small', small[small.length - 1].description, small),
      confidence: days >= SMALL_DAYS ? 'high' : 'medium',
      status: 'new',
      essential: false,
      cadence: null,
      amountCents: Math.round(total / small.length),
      previousAmountCents: null,
      annualCents,
      oneOffCents: 0,
      nextDate: null,
      perMonth: Math.round((small.length * 30) / days),
      active: true,
      priority: annualCents,
    });
  }
  return found;
}

/**
 * Every finding in the user's movements, with the decisions already taken applied. Movements
 * made by a recurring rule, or that match an active rule (`coveredKeys`, merchant keys), are
 * what the user already controls and are left out. A charge decided as «cancel» whose next
 * expected date has passed (plus a margin) without a new one becomes `recovered`.
 */
export function detectMoneyLeaks(
  movements: LeakMovement[],
  options: {
    today: string;
    coveredKeys?: ReadonlySet<string>;
    aliases?: readonly string[];
    decisions?: readonly LeakDecision[];
  }
): LeakReport {
  const { today } = options;
  const covered = options.coveredKeys ?? new Set<string>();
  const aliases = options.aliases ?? [];
  const from = windowStart(today);
  const inWindow = movements.filter((m) => m.date >= from && m.date <= today);
  const expenses = inWindow.filter((m) => m.type === 'EXPENSE');
  const coverage = coverageOf(expenses);

  const byKey = new Map<string, Group>();
  const refunds = new Map<string, Charge[]>();
  for (const m of inWindow) {
    if (m.recurringRuleId !== null) continue;
    const key = merchantKey(m.description, aliases);
    if (!key || covered.has(key)) continue;
    const charge = {
      description: m.description,
      amountCents: m.amountCents,
      date: m.date,
      categoryName: m.categoryName,
    };
    if (m.type === 'INCOME') {
      refunds.set(key, [...(refunds.get(key) ?? []), charge]);
      continue;
    }
    if (m.type !== 'EXPENSE') continue;
    const group = byKey.get(key) ?? { key, charges: [], essential: false, everyday: false };
    group.charges.push(charge);
    group.essential ||= isEssential(m.description, m.categoryName);
    group.everyday ||= EVERYDAY_CATEGORIES.has(normalizeText(m.categoryName));
    byKey.set(key, group);
  }
  const groups = [...byKey.values()].map((g) => ({
    ...g,
    charges: g.charges.sort(
      (a, b) => a.date.localeCompare(b.date) || a.amountCents - b.amountCents
    ),
  }));

  const blocks: RepeatingBlock[] = [];
  for (const group of groups) {
    splitByAmount(group.charges).forEach((charges, block) => {
      // Two identical charges on one day are one charge for the rhythm (and a double charge).
      const distinct = charges.filter(
        (c, i) =>
          i === 0 || c.date !== charges[i - 1].date || c.amountCents !== charges[i - 1].amountCents
      );
      const mid = median(distinct.map((c) => c.amountCents));
      const within = (share: number): boolean =>
        distinct.every((c) => Math.abs(c.amountCents - mid) <= mid * share);
      const found = cadenceOf(distinct.map((c) => c.date));
      if (!found || !within(AMOUNT_TOLERANCE)) return;
      // The weekly shop or a monthly trip to the supermarket is not a service: those need the
      // same price every time.
      const strict = found.cadence === 'weekly' || group.everyday;
      if (strict && !within(STEADY_TOLERANCE)) return;
      blocks.push({ group, block, charges: distinct, ...found });
    });
  }
  const repeating = new Set(blocks.map((b) => b.group.key));
  const all = [
    ...repeatingFindings(blocks, today),
    ...duplicateFindings(groups, refunds),
    ...(coverage.from ? smallFindings(groups, today, coverage.from, repeating) : []),
  ];

  const decisions = new Map((options.decisions ?? []).map((d) => [d.findingId, d]));
  const shown = all
    .filter((f) => f.confidence !== 'low')
    .map((f): LeakFinding => {
      const decision = decisions.get(f.id);
      if (f.status === 'refunded' || !decision) return f;
      if (decision.status === 'cancel' && f.kind === 'recurring' && f.nextDate) {
        const margin = CADENCES[f.cadence as LeakCadence].margin;
        if (daysBetween(f.nextDate, today) > margin) return { ...f, status: 'recovered' };
      }
      return { ...f, status: decision.status };
    })
    // A stopped charge only matters when the user said they would cancel it.
    .filter((f) => f.active || f.status === 'cancel' || f.status === 'recovered');

  // A rise of a repeating charge still to check is told inside its card; it is a finding of its
  // own once the user said they keep the charge (and always for essentials, which have no card).
  const repeatingStatus = new Map(
    shown.filter((f) => f.kind === 'recurring').map((f) => [groupOf(f), f.status])
  );
  const findings = shown.filter((f) => {
    if (f.kind !== 'increase' || f.essential || f.status !== 'new') return true;
    const status = repeatingStatus.get(groupOf(f));
    return status === undefined || status === 'keep';
  });
  const order = (a: LeakFinding, b: LeakFinding): number =>
    b.priority - a.priority || a.fingerprint.localeCompare(b.fingerprint);
  return {
    coverage,
    findings: [
      ...findings.filter((f) => f.status === 'new').sort(order),
      ...findings.filter((f) => f.status !== 'new').sort(order),
    ],
  };
}

/** Merchant key of a finding (the second part of its fingerprint). */
const groupOf = (f: LeakFinding): string => f.fingerprint.split(':')[1];

const floorTo = (cents: Cents, step: Cents): Cents => Math.floor(cents / step) * step;

/** The figures of the screen, from the findings still to check (docs C.8). */
export function summarizeLeaks(findings: readonly LeakFinding[]): LeakSummary {
  const pending = findings.filter((f) => f.status === 'new');
  const byKind = Object.fromEntries(
    (['recurring', 'increase', 'duplicate', 'small'] as const).map((kind) => {
      const list = pending.filter((f) => f.kind === kind);
      return [
        kind,
        { count: list.length, annualCents: list.reduce((s, f) => s + f.annualCents, 0) },
      ];
    })
  ) as LeakSummary['byKind'];
  const yearly = pending.filter((f) => f.kind !== 'duplicate');
  const reviewed = findings.filter((f) => f.status !== 'new');
  const sum = (list: LeakFinding[]): Cents => list.reduce((s, f) => s + f.annualCents, 0);
  return {
    total: {
      annualCents: floorTo(sum(yearly), 1000),
      oneOffCents: floorTo(
        pending.reduce((s, f) => s + f.oneOffCents, 0),
        100
      ),
      count: yearly.length,
    },
    byKind,
    count: pending.length,
    reviewed: {
      count: reviewed.length,
      cancelMonthlyCents: Math.floor(
        sum(reviewed.filter((f) => f.kind === 'recurring' && f.status === 'cancel')) / 12
      ),
      recoveredAnnualCents: sum(reviewed.filter((f) => f.status === 'recovered')),
    },
  };
}

/** What each kind of finding accepts (the buttons of its card, docs C.7). */
export const ALLOWED_DECISIONS: Record<LeakKind, readonly LeakDecisionStatus[]> = {
  recurring: ['keep', 'cancel', 'dismissed', 'not_mine'],
  increase: ['keep', 'dismissed', 'not_mine'],
  duplicate: ['cancel', 'dismissed', 'not_mine'],
  small: ['keep', 'dismissed'],
};
