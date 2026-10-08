import { Migration } from '../migrator';
import { TRIAL_DAYS } from '@domain/model/Subscription';

/**
 * Freemium: subscriptions (trial / Stripe / lifetime), processed billing events,
 * AI usage bookkeeping (global daily neurons, per-user monthly calls, answer cache),
 * affiliate clicks and the "show offers" setting. Existing users get the same
 * 14-day trial as new ones, counted from the day this migration runs.
 */
export const monetization: Migration = {
  version: 5,
  name: 'subscriptions, AI usage, affiliate clicks',
  up(db) {
    db.exec(`
      CREATE TABLE subscriptions (
        user_id                TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        status                 TEXT NOT NULL DEFAULT 'none'
                               CHECK(status IN ('none','trialing','active','past_due','canceled')),
        source                 TEXT NOT NULL DEFAULT 'trial'
                               CHECK(source IN ('trial','stripe','lifetime','manual')),
        trial_ends_at          TEXT,
        current_period_end     TEXT,
        cancel_at_period_end   INTEGER NOT NULL DEFAULT 0,
        lifetime               INTEGER NOT NULL DEFAULT 0,
        stripe_customer_id     TEXT,
        stripe_subscription_id TEXT,
        updated_at             TEXT NOT NULL
      );
      CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
      CREATE INDEX idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);

      CREATE TABLE billing_events (
        id           TEXT PRIMARY KEY,
        type         TEXT NOT NULL,
        processed_at TEXT NOT NULL
      );

      CREATE TABLE ai_daily_usage (
        day     TEXT PRIMARY KEY,
        neurons REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE ai_user_usage (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month   TEXT NOT NULL,
        calls   INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, month)
      );

      CREATE TABLE ai_advice_cache (
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cache_key   TEXT NOT NULL,
        advice_json TEXT NOT NULL,
        created_at  TEXT NOT NULL,
        PRIMARY KEY (user_id, cache_key)
      );

      CREATE TABLE affiliate_clicks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        offer_id   TEXT NOT NULL,
        clicked_at TEXT NOT NULL
      );
      CREATE INDEX idx_affiliate_clicks_offer ON affiliate_clicks(offer_id, clicked_at);

      ALTER TABLE user_settings ADD COLUMN show_offers INTEGER NOT NULL DEFAULT 1;
    `);

    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO subscriptions (user_id, status, source, trial_ends_at, updated_at)
       SELECT id, 'trialing', 'trial', ?, ? FROM users WHERE password_hash IS NOT NULL OR google_id IS NOT NULL`
    ).run(trialEnd, now.toISOString());
  },
};
