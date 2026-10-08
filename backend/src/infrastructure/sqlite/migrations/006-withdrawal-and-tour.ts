import { Migration } from '../migrator';

/**
 * Consumer rights and onboarding: when the paid contract started (14-day
 * withdrawal window), which terms were accepted before paying, when the user
 * withdrew, and whether the guided tour opens after signing in.
 */
export const withdrawalAndTour: Migration = {
  version: 6,
  name: 'withdrawal, terms acceptance, guided tour',
  up(db) {
    db.exec(`
      ALTER TABLE subscriptions ADD COLUMN contract_started_at TEXT;
      ALTER TABLE subscriptions ADD COLUMN terms_accepted_at TEXT;
      ALTER TABLE subscriptions ADD COLUMN terms_version TEXT;
      ALTER TABLE subscriptions ADD COLUMN withdrawn_at TEXT;
      ALTER TABLE user_settings ADD COLUMN show_tour INTEGER NOT NULL DEFAULT 1;
    `);
  },
};
