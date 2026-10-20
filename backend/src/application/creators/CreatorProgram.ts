import {
  CreatorAffiliateRecord,
  CreatorPlan,
  CreatorRepository,
  CreatorSaleProvider,
  CreatorSaleRecord,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';

/**
 * Creator affiliate program (docs/afiliacion/programa.md): a creator's code, given at sign-up
 * with the user's explicit agreement, attributes the user's first Premium payment to the
 * creator. Nothing is paid automatically: the report says what is owed and the owner pays.
 */
export interface CreatorProgramConfig {
  /** Off by default: no attribution and no new sales (reversals are still recorded). */
  enabled: boolean;
  commissionCents: Record<CreatorPlan, number>;
  /** Most a creator can earn per calendar year (an affiliate can have its own). */
  creatorCapCents: number;
  /** Most the whole program pays per calendar year. */
  globalCapCents: number;
  /** Days after the sign-up in which the first payment still counts. */
  windowDays: number;
  /** Days a sale waits for refunds and chargebacks before it can be paid. */
  holdDays: number;
}

/** Refunds and chargebacks this long after a sale still take its commission back. */
export const CREATOR_CLAWBACK_DAYS = 120;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Letters and digits only, so it reads well in a video and in a URL. */
const CODE_PATTERN = /^[A-Z0-9]{3,20}$/;

export function normalizeCreatorCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

export type CreatorSaleStatus =
  /** Still within the hold period. */
  | 'pending'
  /** Past the hold period, not paid yet. */
  | 'payable'
  | 'paid'
  /** Refunded or charged back before being paid. */
  | 'reversed'
  /** Reversed after being paid: to deduct from the next payment. */
  | 'clawback'
  /** Valid, but the cap of the year was already reached. */
  | 'over_cap';

export interface CreatorSaleLine {
  sale: CreatorSaleRecord;
  status: CreatorSaleStatus;
  /** What the sale is worth after the caps (or what to deduct, for a clawback). */
  cents: number;
}

export interface CreatorSummary {
  affiliate: CreatorAffiliateRecord;
  signups: number;
  sales: number;
  pending: number;
  payable: number;
  paid: number;
  reversed: number;
  overCap: number;
  /** Amounts in cents. */
  pendingCents: number;
  payableCents: number;
  paidCents: number;
  clawbackCents: number;
  /** What to transfer now: payable minus clawbacks (never below zero). */
  netCents: number;
  lines: CreatorSaleLine[];
}

export interface CreatorReport {
  enabled: boolean;
  config: CreatorProgramConfig;
  creators: CreatorSummary[];
  /** Commissions counted against the global cap, per calendar year. */
  globalUsedCents: Record<string, number>;
}

const yearOf = (iso: string): string => iso.slice(0, 4);

/**
 * Classifies every sale. Paid sales use the caps first (what was paid stays paid); the rest
 * take what is left in order of sale. Reversed sales do not use any cap.
 */
export function classifySales(
  sales: CreatorSaleRecord[],
  affiliates: CreatorAffiliateRecord[],
  config: CreatorProgramConfig,
  now: Date
): { lines: CreatorSaleLine[]; globalUsedCents: Record<string, number> } {
  const capOf = new Map(affiliates.map((a) => [a.code, a.capCents ?? config.creatorCapCents]));
  const creatorUsed = new Map<string, number>();
  const globalUsed: Record<string, number> = {};
  const use = (sale: CreatorSaleRecord, cents: number): void => {
    const key = `${sale.code}|${yearOf(sale.soldAt)}`;
    creatorUsed.set(key, (creatorUsed.get(key) ?? 0) + cents);
    globalUsed[yearOf(sale.soldAt)] = (globalUsed[yearOf(sale.soldAt)] ?? 0) + cents;
  };
  const ordered = [...sales].sort((a, b) => a.soldAt.localeCompare(b.soldAt) || a.id - b.id);
  for (const sale of ordered) {
    if (!sale.reversedAt && sale.paidAt) use(sale, sale.paidCents ?? 0);
  }
  const lines = ordered.map((sale): CreatorSaleLine => {
    if (sale.reversedAt) {
      const clawback = sale.paidAt !== null && sale.clawedAt === null;
      return {
        sale,
        status: clawback ? 'clawback' : 'reversed',
        cents: clawback ? (sale.paidCents ?? 0) : 0,
      };
    }
    if (sale.paidAt) return { sale, status: 'paid', cents: sale.paidCents ?? 0 };
    const year = yearOf(sale.soldAt);
    const creatorLeft =
      (capOf.get(sale.code) ?? config.creatorCapCents) -
      (creatorUsed.get(`${sale.code}|${year}`) ?? 0);
    const globalLeft = config.globalCapCents - (globalUsed[year] ?? 0);
    const cents = Math.max(0, Math.min(sale.commissionCents, creatorLeft, globalLeft));
    if (cents === 0) return { sale, status: 'over_cap', cents: 0 };
    use(sale, cents);
    const held = new Date(sale.soldAt).getTime() + config.holdDays * DAY_MS > now.getTime();
    return { sale, status: held ? 'pending' : 'payable', cents };
  });
  return { lines, globalUsedCents: globalUsed };
}

export class CreatorProgram {
  constructor(
    private readonly repo: CreatorRepository,
    private readonly clock: Clock,
    readonly config: CreatorProgramConfig
  ) {}

  /**
   * Attributes a brand-new user to a creator. Only with the user's agreement, only while the
   * program is on and only to an active creator: anything else is ignored silently, so a bad
   * code never blocks a sign-up.
   */
  attach(userId: string, rawCode: string, consent: boolean): void {
    if (!this.config.enabled || !consent) return;
    const code = normalizeCreatorCode(rawCode);
    const affiliate = code ? this.repo.affiliate(code) : null;
    if (!affiliate?.active) return;
    this.repo.attribute(userId, affiliate.code, this.clock.now().toISOString());
  }

  /** A paid Premium purchase (never a trial or the Renta pass): only the user's first one counts. */
  recordSale(userId: string, plan: CreatorPlan, provider: CreatorSaleProvider): void {
    if (!this.config.enabled) return;
    const attribution = this.repo.attributionOf(userId);
    if (!attribution) return;
    const now = this.clock.now();
    const age = now.getTime() - new Date(attribution.createdAt).getTime();
    if (age > this.config.windowDays * DAY_MS) return;
    this.repo.addSale(userId, {
      code: attribution.code,
      plan,
      provider,
      commissionCents: this.config.commissionCents[plan],
      soldAt: now.toISOString(),
      reversedAt: null,
      paidAt: null,
      paidCents: null,
      clawedAt: null,
    });
  }

  /** A refund or a chargeback. Recorded even with the program off, so nothing refunded is paid. */
  reverseSale(userId: string): void {
    const sale = this.repo.saleOf(userId);
    if (!sale || sale.reversedAt) return;
    const now = this.clock.now();
    if (now.getTime() - new Date(sale.soldAt).getTime() > CREATOR_CLAWBACK_DAYS * DAY_MS) return;
    this.repo.markReversed(sale.id, now.toISOString());
  }

  /** The user withdraws the agreement: the link to the creator goes. */
  forget(userId: string): void {
    this.repo.forget(userId);
  }

  addAffiliate(rawCode: string, name: string, capCents: number | null): CreatorAffiliateRecord {
    const code = normalizeCreatorCode(rawCode);
    if (!code) throw new Error('El código debe tener de 3 a 20 letras o cifras');
    const clean = name.trim().slice(0, 80);
    if (!clean) throw new Error('Falta el nombre (alias) del creador');
    const record: CreatorAffiliateRecord = {
      code,
      name: clean,
      capCents,
      active: true,
      createdAt: this.clock.now().toISOString(),
    };
    if (!this.repo.addAffiliate(record)) throw new Error(`El código ${code} ya existe`);
    return record;
  }

  setActive(rawCode: string, active: boolean): void {
    const code = normalizeCreatorCode(rawCode);
    if (!code || !this.repo.setActive(code, active)) throw new Error('Código desconocido');
  }

  report(): CreatorReport {
    const affiliates = this.repo.affiliates();
    const signups = this.repo.signupsByCode();
    const { lines, globalUsedCents } = classifySales(
      this.repo.sales(),
      affiliates,
      this.config,
      this.clock.now()
    );
    const creators = affiliates.map((affiliate): CreatorSummary => {
      const own = lines.filter((l) => l.sale.code === affiliate.code);
      const count = (status: CreatorSaleStatus): number =>
        own.filter((l) => l.status === status).length;
      const cents = (status: CreatorSaleStatus): number =>
        own.filter((l) => l.status === status).reduce((n, l) => n + l.cents, 0);
      const payableCents = cents('payable');
      const clawbackCents = cents('clawback');
      return {
        affiliate,
        signups: signups[affiliate.code] ?? 0,
        sales: own.length,
        pending: count('pending'),
        payable: count('payable'),
        paid: count('paid'),
        reversed: count('reversed') + count('clawback'),
        overCap: count('over_cap'),
        pendingCents: cents('pending'),
        payableCents,
        paidCents: cents('paid'),
        clawbackCents,
        netCents: Math.max(0, payableCents - clawbackCents),
        lines: own,
      };
    });
    return { enabled: this.config.enabled, config: this.config, creators, globalUsedCents };
  }

  /**
   * Records that the owner has transferred a creator's net amount (the payment itself is made
   * by hand, outside the app). Returns what was recorded; 0 when there is nothing to pay.
   */
  markPaid(rawCode: string): number {
    const code = normalizeCreatorCode(rawCode);
    const summary = this.report().creators.find((c) => c.affiliate.code === code);
    if (!summary) throw new Error('Código desconocido');
    if (summary.netCents <= 0) return 0;
    const paid = summary.lines
      .filter((l) => l.status === 'payable')
      .map((l) => ({ id: l.sale.id, cents: l.cents }));
    const clawed = summary.lines.filter((l) => l.status === 'clawback').map((l) => l.sale.id);
    this.repo.markPaid(paid, clawed, this.clock.now().toISOString());
    return summary.netCents;
  }
}
