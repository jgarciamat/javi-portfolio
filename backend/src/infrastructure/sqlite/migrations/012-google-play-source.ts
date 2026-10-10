import { Migration } from '../migrator';

/**
 * Subscriptions bought inside the Android app (Google Play, through RevenueCat) are a
 * new `source`. The CHECK constraint cannot be altered in place, so the table is rebuilt.
 */
export const googlePlaySource: Migration = {
  version: 12,
  name: 'subscription source google',
  up(db) {
    db.exec(`
      CREATE TABLE subscriptions_new (
        user_id                TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        status                 TEXT NOT NULL DEFAULT 'none'
                               CHECK(status IN ('none','trialing','active','past_due','canceled')),
        source                 TEXT NOT NULL DEFAULT 'trial'
                               CHECK(source IN ('trial','stripe','lifetime','manual','google')),
        trial_ends_at          TEXT,
        current_period_end     TEXT,
        cancel_at_period_end   INTEGER NOT NULL DEFAULT 0,
        lifetime               INTEGER NOT NULL DEFAULT 0,
        stripe_customer_id     TEXT,
        stripe_subscription_id TEXT,
        updated_at             TEXT NOT NULL,
        terms_accepted_at      TEXT,
        terms_version          TEXT,
        withdrawal_waived_at   TEXT
      );
      INSERT INTO subscriptions_new (user_id, status, source, trial_ends_at, current_period_end,
        cancel_at_period_end, lifetime, stripe_customer_id, stripe_subscription_id, updated_at,
        terms_accepted_at, terms_version, withdrawal_waived_at)
      SELECT user_id, status, source, trial_ends_at, current_period_end, cancel_at_period_end,
        lifetime, stripe_customer_id, stripe_subscription_id, updated_at, terms_accepted_at,
        terms_version, withdrawal_waived_at FROM subscriptions;
      DROP TABLE subscriptions;
      ALTER TABLE subscriptions_new RENAME TO subscriptions;
      CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
      CREATE INDEX idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
    `);
  },
};
