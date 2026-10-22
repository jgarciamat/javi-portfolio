import { PersonalDataReader } from '@domain/ports/repositories';
import { SecretBox } from '@domain/ports/two-factor';
import { fromCents } from '@domain/shared/money';
import { Db } from '../database';

type Row = Record<string, unknown>;

const money = (cents: unknown): number | null =>
  typeof cents === 'number' ? fromCents(cents) : null;

function hostOf(endpoint: string): string | null {
  try {
    return new URL(endpoint).host;
  } catch {
    return null;
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Everything the export needs beyond the main repositories, straight from SQLite.
 * Data about other people (household members, referred friends) is left out except
 * for dates and counts; secrets (push keys, Stripe subscription ids) are never read.
 */
export class SqlitePersonalDataReader implements PersonalDataReader {
  constructor(
    private readonly db: Db,
    private readonly inboxDomain: string | null = null,
    /** Opens the self-employed form saved in the account: the export carries it in clear. */
    private readonly autonomoBox: SecretBox | null = null
  ) {}

  sectionsFor(userId: string): Record<string, unknown> {
    return {
      assets: this.assets(userId),
      categoryRules: this.all(
        `SELECT r.pattern, c.name AS category, r.created_at AS createdAt
         FROM category_rules r JOIN categories c ON c.id = r.category_id
         WHERE r.user_id = ? ORDER BY r.created_at`,
        userId
      ),
      businessCategories: this.all(
        `SELECT c.name AS category, b.vat_rate AS vatRate
         FROM category_business b JOIN categories c ON c.id = b.category_id
         WHERE b.user_id = ? ORDER BY c.name`,
        userId
      ),
      recurringSkips: this.all(
        `SELECT s.rule_id AS recurringRuleId, s.year, s.month
         FROM recurring_rule_skips s JOIN recurring_rules r ON r.id = s.rule_id
         WHERE r.user_id = ? ORDER BY s.year, s.month`,
        userId
      ),
      splitGroups: this.splitGroups(userId),
      inbox: this.inbox(userId),
      subscription: this.subscription(userId),
      renta: {
        passEndsAt:
          this.one('SELECT ends_at FROM renta_passes WHERE user_id = ?', userId)?.ends_at ?? null,
        calculations: this.uses('renta_calculations', userId),
        calculationsByCampaign: this.all(
          'SELECT campaign, uses FROM renta_campaign_uses WHERE user_id = ? ORDER BY campaign',
          userId
        ),
        autonomoDrafts: this.uses('autonomo_drafts', userId),
        autonomoDraftsByQuarter: this.all(
          `SELECT year, quarter, uses FROM autonomo_quarter_drafts
           WHERE user_id = ? ORDER BY year, quarter`,
          userId
        ),
        autonomoPdfs: this.uses('autonomo_pdfs', userId),
      },
      imports: this.uses('import_uses', userId),
      referrals: this.referrals(userId),
      creator: this.creator(userId),
      household: this.household(userId),
      pushSubscriptions: this.all(
        'SELECT endpoint, created_at AS createdAt FROM push_subscriptions WHERE user_id = ? ORDER BY created_at',
        userId
      ).map((p) => ({ endpointHost: hostOf(p.endpoint as string), createdAt: p.createdAt })),
      pushLog: this.all(
        'SELECT kind, key, sent_at AS sentAt FROM push_log WHERE user_id = ? ORDER BY sent_at',
        userId
      ),
      aiUsage: this.all(
        'SELECT month, calls FROM ai_user_usage WHERE user_id = ? ORDER BY month',
        userId
      ),
      aiAdvice: this.all(
        'SELECT cache_key AS key, advice_json, created_at AS createdAt FROM ai_advice_cache WHERE user_id = ? ORDER BY created_at',
        userId
      ).map((a) => ({
        key: a.key,
        createdAt: a.createdAt,
        advice: parseJson(a.advice_json as string),
      })),
      affiliateClicks: this.all(
        'SELECT offer_id AS offerId, clicked_at AS clickedAt FROM affiliate_clicks WHERE user_id = ? ORDER BY clicked_at',
        userId
      ),
      security: this.security(userId),
      autonomoData: this.autonomoData(userId),
      cryptoSimulator: this.cryptoSimulator(userId),
    };
  }

  /** The play-money simulator of the crypto console: balance, purchases and pending orders. */
  private cryptoSimulator(userId: string): Row | null {
    const account = this.one(
      `SELECT initial_cents, cash_cents, fee_bps AS feeBps, started_at AS startedAt
       FROM crypto_sim_accounts WHERE user_id = ?`,
      userId
    );
    if (!account) return null;
    const { initial_cents, cash_cents, ...rest } = account;
    return {
      ...rest,
      initial: money(initial_cents),
      cash: money(cash_cents),
      operations: this.all(
        `SELECT id, symbol, direction, quantity, entry_price AS entryPrice, amount_cents, entry_fee_cents,
                open_type AS openType, opened_at AS openedAt, exit_price AS exitPrice,
                exit_fee_cents, proceeds_cents, pnl_cents, close_type AS closeType,
                closed_at AS closedAt
         FROM crypto_sim_positions WHERE user_id = ? ORDER BY opened_at`,
        userId
      ).map(
        ({ amount_cents, entry_fee_cents, exit_fee_cents, proceeds_cents, pnl_cents, ...p }) => ({
          ...p,
          invested: money(amount_cents),
          entryFee: money(entry_fee_cents),
          exitFee: money(exit_fee_cents),
          proceeds: money(proceeds_cents),
          result: money(pnl_cents),
        })
      ),
      pendingOrders: this.all(
        `SELECT id, symbol, side, direction, type, price, amount_cents, reserved_cents,
                position_id AS positionId, take_profit AS takeProfit, stop_loss AS stopLoss,
                created_at AS createdAt
         FROM crypto_sim_orders WHERE user_id = ? ORDER BY created_at`,
        userId
      ).map(({ amount_cents, reserved_cents, ...o }) => ({
        ...o,
        amount: money(amount_cents),
        reserved: money(reserved_cents),
      })),
    };
  }

  /** The self-employed form saved in the account, decrypted (null when it cannot be). */
  private autonomoData(userId: string): Row | null {
    const row = this.one(
      'SELECT payload_enc, updated_at, version FROM autonomo_data WHERE user_id = ?',
      userId
    );
    if (!row) return null;
    const plain = this.autonomoBox?.decrypt(row.payload_enc as string) ?? null;
    return {
      updatedAt: row.updated_at,
      version: row.version,
      data: plain === null ? null : parseJson(plain),
      unreadable: plain === null,
    };
  }

  /** Whether 2FA is on and how many recovery codes are left: never the secret or the codes. */
  private security(userId: string): Row {
    const enabledAt =
      (this.one('SELECT enabled_at FROM user_two_factor WHERE user_id = ?', userId)?.enabled_at as
        string | null | undefined) ?? null;
    return {
      twoFactorEnabled: enabledAt !== null,
      twoFactorEnabledAt: enabledAt,
      recoveryCodesRemaining: enabledAt
        ? (this.one(
            'SELECT COUNT(*) AS n FROM two_factor_recovery_codes WHERE user_id = ? AND used_at IS NULL',
            userId
          )!.n as number)
        : 0,
    };
  }

  private all(sql: string, ...params: unknown[]): Row[] {
    return this.db.prepare(sql).all(...params) as Row[];
  }

  private one(sql: string, ...params: unknown[]): Row | undefined {
    return this.db.prepare(sql).get(...params) as Row | undefined;
  }

  private uses(table: string, userId: string): number {
    return (this.one(`SELECT uses FROM ${table} WHERE user_id = ?`, userId)?.uses as number) ?? 0;
  }

  private assets(userId: string): Row[] {
    return this.all(
      `SELECT id, name, kind, interest_rate AS interestRate, min_payment_cents,
              created_at AS createdAt
       FROM assets WHERE user_id = ? ORDER BY created_at`,
      userId
    ).map(({ min_payment_cents, ...a }) => ({
      ...a,
      minPayment: money(min_payment_cents),
      values: this.all(
        'SELECT date, value_cents FROM asset_values WHERE asset_id = ? ORDER BY date',
        a.id
      ).map((v) => ({ date: v.date, value: money(v.value_cents) })),
    }));
  }

  private splitGroups(userId: string): Row[] {
    return this.all(
      'SELECT id, name, created_at AS createdAt FROM split_groups WHERE user_id = ? ORDER BY created_at',
      userId
    ).map((g) => ({
      ...g,
      members: this.all(
        'SELECT id, name FROM split_members WHERE group_id = ? ORDER BY rowid',
        g.id
      ),
      expenses: this.all(
        `SELECT id, description, amount_cents, paid_by AS paidBy, date, settlement,
                created_at AS createdAt
         FROM split_expenses WHERE group_id = ? ORDER BY date, created_at`,
        g.id
      ).map(({ amount_cents, settlement, ...e }) => ({
        ...e,
        amount: money(amount_cents),
        settlement: settlement === 1,
        shares: this.all(
          'SELECT member_id AS memberId, share_cents FROM split_shares WHERE expense_id = ?',
          e.id
        ).map((s) => ({ memberId: s.memberId, share: money(s.share_cents) })),
      })),
    }));
  }

  private inbox(userId: string): Row {
    const token = this.one('SELECT token FROM inbox_tokens WHERE user_id = ?', userId)?.token;
    return {
      address: token && this.inboxDomain ? `${token}@${this.inboxDomain}` : null,
      messages: this.all(
        `SELECT received_at AS receivedAt, status, description, amount_cents
         FROM inbox_messages WHERE user_id = ? ORDER BY received_at`,
        userId
      ).map(({ amount_cents, ...m }) => ({ ...m, amount: money(amount_cents) })),
    };
  }

  private subscription(userId: string): Row | null {
    const s = this.one(
      `SELECT status, source, trial_ends_at, current_period_end, cancel_at_period_end, lifetime,
              paid_since, stripe_customer_id, terms_accepted_at, terms_version,
              withdrawal_waived_at, updated_at
       FROM subscriptions WHERE user_id = ?`,
      userId
    );
    if (!s) return null;
    return {
      status: s.status,
      source: s.source,
      trialEndsAt: s.trial_ends_at,
      currentPeriodEnd: s.current_period_end,
      cancelAtPeriodEnd: s.cancel_at_period_end === 1,
      lifetime: s.lifetime === 1,
      paidSince: s.paid_since,
      stripeCustomerId: s.stripe_customer_id,
      termsAcceptedAt: s.terms_accepted_at,
      termsVersion: s.terms_version,
      withdrawalWaivedAt: s.withdrawal_waived_at,
      updatedAt: s.updated_at,
    };
  }

  private referrals(userId: string): Row {
    const code = this.one(
      'SELECT code, rewards_granted FROM referral_codes WHERE user_id = ?',
      userId
    );
    return {
      code: code?.code ?? null,
      rewardsGranted: code?.rewards_granted ?? 0,
      invited: this.all(
        'SELECT created_at AS createdAt, rewarded_at AS rewardedAt FROM referrals WHERE referrer_id = ? ORDER BY created_at',
        userId
      ),
      referredBy:
        this.one(
          'SELECT created_at AS createdAt, rewarded_at AS rewardedAt FROM referrals WHERE referred_id = ?',
          userId
        ) ?? null,
    };
  }

  /** The creator code the user agreed to at sign-up, and whether a first payment counted for it. */
  private creator(userId: string): Row | null {
    const attribution = this.one(
      'SELECT code, created_at AS consentedAt FROM creator_attributions WHERE user_id = ?',
      userId
    );
    if (!attribution) return null;
    const sale = this.one(
      'SELECT plan, sold_at AS soldAt, reversed_at AS reversedAt FROM creator_sales WHERE user_id = ?',
      userId
    );
    return { ...attribution, sale: sale ?? null };
  }

  private household(userId: string): Row {
    const membership = this.one(
      'SELECT joined_at AS joinedAt FROM household_members WHERE member_id = ?',
      userId
    );
    if (membership) return { role: 'member', joinedAt: membership.joinedAt };
    const members = this.one(
      'SELECT COUNT(*) AS n FROM household_members WHERE owner_id = ?',
      userId
    )!.n as number;
    return members > 0 ? { role: 'owner', members } : { role: null };
  }
}
