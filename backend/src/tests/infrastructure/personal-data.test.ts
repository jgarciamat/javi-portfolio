import { openDatabase, Db } from '@infrastructure/sqlite/database';
import { migrate } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';
import { SqlitePersonalDataReader } from '@infrastructure/sqlite/repositories/SqlitePersonalDataReader';
import { AesSecretBox } from '@infrastructure/auth/AesSecretBox';

const box = new AesSecretBox('k'.repeat(40), 'autonomo-data');

const NOW = '2026-03-15T10:00:00.000Z';

function addUser(db: Db, id: string): void {
  db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    `${id}@test.dev`,
    id,
    NOW
  );
}

function seed(db: Db): void {
  for (const id of ['ana', 'bea', 'carl']) addUser(db, id);
  db.exec(`
    INSERT INTO categories (id, user_id, name) VALUES ('c1', 'ana', 'Comida');
    INSERT INTO accounts (id, user_id, name, created_at) VALUES ('a1', 'ana', 'Principal', '${NOW}');
    INSERT INTO assets (id, user_id, name, kind, created_at, interest_rate, min_payment_cents)
      VALUES ('as1', 'ana', 'Hipoteca', 'debt', '${NOW}', 2.5, 50000),
             ('as2', 'ana', 'Coche', 'vehicle', '${NOW}', NULL, NULL);
    INSERT INTO asset_values (asset_id, date, value_cents) VALUES ('as1', '2026-03-01', 1234500);
    INSERT INTO category_rules (id, user_id, pattern, category_id, created_at)
      VALUES ('r1', 'ana', 'mercadona', 'c1', '${NOW}');
    INSERT INTO category_business (category_id, user_id, vat_rate) VALUES ('c1', 'ana', 10);
    INSERT INTO recurring_rules (id, user_id, description, amount_cents, type, category_id,
      start_year, start_month, created_at)
      VALUES ('rr1', 'ana', 'Gym', 3000, 'EXPENSE', 'c1', 2026, 1, '${NOW}');
    INSERT INTO recurring_rule_skips (rule_id, year, month) VALUES ('rr1', 2026, 2);
    INSERT INTO split_groups (id, user_id, name, created_at) VALUES ('g1', 'ana', 'Viaje', '${NOW}');
    INSERT INTO split_members (id, group_id, name) VALUES ('m1', 'g1', 'Ana'), ('m2', 'g1', 'Luis');
    INSERT INTO split_expenses (id, group_id, description, amount_cents, paid_by, date, created_at)
      VALUES ('e1', 'g1', 'Cena', 4000, 'm1', '2026-03-02', '${NOW}');
    INSERT INTO split_shares (expense_id, member_id, share_cents)
      VALUES ('e1', 'm1', 2000), ('e1', 'm2', 2000);
    INSERT INTO inbox_tokens (user_id, token, created_at) VALUES ('ana', 'tok123', '${NOW}');
    INSERT INTO inbox_messages (id, user_id, received_at, status, description, amount_cents)
      VALUES ('i1', 'ana', '${NOW}', 'imported', 'Amazon', 1999),
             ('i2', 'ana', '${NOW}', 'unreadable', NULL, NULL);
    INSERT INTO subscriptions (user_id, status, source, stripe_customer_id, stripe_subscription_id,
      updated_at, terms_accepted_at, terms_version, cancel_at_period_end, lifetime)
      VALUES ('ana', 'active', 'stripe', 'cus_1', 'sub_secret', '${NOW}', '${NOW}', '2026-10', 1, 0);
    INSERT INTO renta_passes (user_id, ends_at) VALUES ('ana', '2026-07-01T00:00:00.000Z');
    INSERT INTO renta_calculations (user_id, uses) VALUES ('ana', 3);
    INSERT INTO renta_campaign_uses (user_id, campaign, uses) VALUES ('ana', 2026, 2), ('ana', 2025, 1);
    INSERT INTO autonomo_quarter_drafts (user_id, year, quarter, uses, territory, territory_extra)
      VALUES ('ana', 2026, 1, 1, 'ceuta', 1);
    INSERT INTO import_uses (user_id, uses) VALUES ('ana', 2);
    INSERT INTO referral_codes (user_id, code, rewards_granted) VALUES ('ana', 'ANA1', 1);
    INSERT INTO referrals (referred_id, referrer_id, created_at, rewarded_at)
      VALUES ('carl', 'ana', '${NOW}', '${NOW}'), ('ana', 'bea', '${NOW}', NULL);
    INSERT INTO household_members (member_id, owner_id, joined_at) VALUES ('bea', 'ana', '${NOW}');
    INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
      VALUES ('p1', 'ana', 'https://fcm.googleapis.com/fcm/send/abc', 'KEY', 'AUTH', '${NOW}'),
             ('p2', 'ana', 'not a url', 'KEY2', 'AUTH2', '${NOW}');
    INSERT INTO push_log (user_id, kind, key, sent_at) VALUES ('ana', 'bill', 'rr1-2026-03', '${NOW}');
    INSERT INTO ai_user_usage (user_id, month, calls) VALUES ('ana', '2026-03', 4);
    INSERT INTO ai_advice_cache (user_id, cache_key, advice_json, created_at)
      VALUES ('ana', 'k1', '{"tip":"ahorra"}', '${NOW}'), ('ana', 'k2', 'not json', '${NOW}');
    INSERT INTO affiliate_clicks (user_id, offer_id, clicked_at) VALUES ('ana', 'bank-x', '${NOW}');
    INSERT INTO creator_affiliates (code, name, created_at) VALUES ('LOLA', 'Lola', '${NOW}');
    INSERT INTO creator_attributions (user_id, code, created_at)
      VALUES ('ana', 'LOLA', '${NOW}'), ('bea', 'LOLA', '${NOW}');
    INSERT INTO creator_sales (user_id, code, plan, provider, commission_cents, sold_at)
      VALUES ('ana', 'LOLA', 'yearly', 'stripe', 700, '${NOW}');
  `);
  db.prepare(
    'INSERT INTO autonomo_data (user_id, payload_enc, updated_at, version) VALUES (?, ?, ?, ?)'
  ).run('ana', box.encrypt('{"extras":{"priorNet":"-300"}}'), NOW, 4);
}

describe('SqlitePersonalDataReader', () => {
  let db: Db;

  beforeEach(() => {
    db = openDatabase(':memory:');
    migrate(db, migrations);
    seed(db);
  });
  afterEach(() => db.close());

  it('exports every extra section of the user, without secrets', () => {
    const data = new SqlitePersonalDataReader(db, 'facturas.finanverso.app', box).sectionsFor(
      'ana'
    );
    expect(data).toMatchObject({
      assets: [
        {
          name: 'Hipoteca',
          kind: 'debt',
          interestRate: 2.5,
          minPayment: 500,
          values: [{ date: '2026-03-01', value: 12345 }],
        },
        { name: 'Coche', minPayment: null, values: [] },
      ],
      categoryRules: [{ pattern: 'mercadona', category: 'Comida' }],
      businessCategories: [{ category: 'Comida', vatRate: 10 }],
      recurringSkips: [{ recurringRuleId: 'rr1', year: 2026, month: 2 }],
      splitGroups: [
        {
          name: 'Viaje',
          members: [{ name: 'Ana' }, { name: 'Luis' }],
          expenses: [
            {
              description: 'Cena',
              amount: 40,
              settlement: false,
              shares: expect.arrayContaining([{ memberId: 'm2', share: 20 }]),
            },
          ],
        },
      ],
      inbox: {
        address: 'tok123@facturas.finanverso.app',
        messages: [
          { status: 'imported', description: 'Amazon', amount: 19.99 },
          { status: 'unreadable', description: null, amount: null },
        ],
      },
      subscription: {
        status: 'active',
        source: 'stripe',
        stripeCustomerId: 'cus_1',
        termsVersion: '2026-10',
        cancelAtPeriodEnd: true,
        lifetime: false,
      },
      renta: {
        passEndsAt: '2026-07-01T00:00:00.000Z',
        calculations: 3,
        calculationsByCampaign: [
          { campaign: 2025, uses: 1 },
          { campaign: 2026, uses: 2 },
        ],
        autonomoDrafts: 0,
        autonomoDraftsByQuarter: [
          { year: 2026, quarter: 1, uses: 1, territory: 'ceuta', territoryExtra: 1 },
        ],
        autonomoPdfs: 0,
      },
      imports: 2,
      referrals: {
        code: 'ANA1',
        rewardsGranted: 1,
        invited: [{ createdAt: NOW, rewardedAt: NOW }],
        referredBy: { createdAt: NOW, rewardedAt: null },
      },
      household: { role: 'owner', members: 1 },
      pushSubscriptions: [
        { endpointHost: 'fcm.googleapis.com', createdAt: NOW },
        { endpointHost: null, createdAt: NOW },
      ],
      pushLog: [{ kind: 'bill', key: 'rr1-2026-03' }],
      aiUsage: [{ month: '2026-03', calls: 4 }],
      aiAdvice: [
        { key: 'k1', advice: { tip: 'ahorra' } },
        { key: 'k2', advice: 'not json' },
      ],
      affiliateClicks: [{ offerId: 'bank-x', clickedAt: NOW }],
      creator: {
        code: 'LOLA',
        consentedAt: NOW,
        sale: { plan: 'yearly', soldAt: NOW, reversedAt: null },
      },
      autonomoData: {
        data: { extras: { priorNet: '-300' } },
        unreadable: false,
        version: 4,
        updatedAt: NOW,
      },
    });
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/sub_secret|KEY|AUTH|\/fcm\/send|carl|bea/);
  });

  it('gives empty sections to a member without data of their own', () => {
    const data = new SqlitePersonalDataReader(db).sectionsFor('bea');
    expect(data).toMatchObject({
      assets: [],
      inbox: { address: null, messages: [] },
      subscription: null,
      renta: { passEndsAt: null, calculations: 0, calculationsByCampaign: [] },
      imports: 0,
      referrals: {
        code: null,
        rewardsGranted: 0,
        invited: [{ rewardedAt: null }],
        referredBy: null,
      },
      household: { role: 'member', joinedAt: NOW },
      creator: { code: 'LOLA', consentedAt: NOW, sale: null },
      autonomoData: null,
    });
    expect(new SqlitePersonalDataReader(db).sectionsFor('carl').household).toEqual({ role: null });
    expect(new SqlitePersonalDataReader(db).sectionsFor('carl').creator).toBeNull();
  });

  it('says the saved self-employed form cannot be opened without its key', () => {
    expect(new SqlitePersonalDataReader(db).sectionsFor('ana').autonomoData).toEqual({
      data: null,
      unreadable: true,
      version: 4,
      updatedAt: NOW,
    });
  });

  it('removes the saved self-employed form with the account', () => {
    db.prepare("DELETE FROM users WHERE id = 'ana'").run();
    expect(db.prepare('SELECT COUNT(*) AS n FROM autonomo_data').get()).toEqual({ n: 0 });
  });

  it('leaves the inbox address out while the feature has no domain', () => {
    expect(new SqlitePersonalDataReader(db).sectionsFor('ana').inbox).toMatchObject({
      address: null,
    });
  });
});
