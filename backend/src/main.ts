import dotenv from 'dotenv';
import { AppConfig, loadConfig } from '@config/env';
import { User } from '@domain/model/User';
import { Account, DEFAULT_ACCOUNT_NAME } from '@domain/model/Account';
import { defaultSettings } from '@domain/model/UserSettings';
import { buildContainer, Container } from '@infrastructure/container';
import { createApp } from '@infrastructure/http/app';
import { BackupService } from '@infrastructure/backup/BackupService';
import { openDatabase } from '@infrastructure/sqlite/database';
import { migrate, prunePreMigrationCopies } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';

/** Optional demo user for local development only (never in production). */
async function seedDemoUser(c: Container, config: AppConfig): Promise<void> {
  if (!config.demoSeed.enabled || !config.demoSeed.password) return;
  if (c.repos.users.findByEmail(config.demoSeed.email)) return;
  const bcrypt = await import('bcryptjs');
  const user = User.register({
    email: config.demoSeed.email,
    name: 'Demo',
    passwordHash: await bcrypt.hash(config.demoSeed.password, 10),
    emailVerified: true,
  });
  const account = Account.create(user.id, { name: DEFAULT_ACCOUNT_NAME });
  c.db.transaction(() => {
    c.repos.users.save(user);
    c.repos.categories.seedDefaults(user.id);
    c.repos.accounts.save(account);
    c.repos.settings.save({ ...defaultSettings(user.id), defaultAccountId: account.id });
    c.entitlements.grantTrial(user.id);
  })();
  console.info(`[seed] demo user ${config.demoSeed.email} created`);
}

async function main(): Promise<void> {
  dotenv.config();
  const config = loadConfig();
  const db = openDatabase(config.databasePath);
  const result = migrate(db, migrations, { databaseFile: config.databasePath, logger: console });
  if (result.to !== result.from) console.info(`[db] migrated ${result.from} → ${result.to}`);
  for (const file of prunePreMigrationCopies(config.databasePath)) {
    console.info(`[db] removed old pre-migration copy ${file}`);
  }
  // Refreshes the query planner's statistics where they are missing or stale (new indexes
  // included); cheap, and again on shutdown as SQLite recommends for long-lived connections.
  db.pragma('optimize=0x10002');

  const container = buildContainer(db, config);
  await seedDemoUser(container, config);

  if (config.ai.provider === 'gemini') {
    console.warn(
      '[config] AI_PROVIDER=gemini: use a PAID key. The free tier may not serve users in the EEA.'
    );
  }
  if (config.ai.provider === 'none') {
    console.info(
      '[config] no AI provider configured: AI analyses fall back to the rule-based ones'
    );
  }
  if (!config.push) {
    console.info('[config] VAPID keys are not set: push notifications are disabled');
  }
  if (!config.billing.stripe) {
    console.info('[config] Stripe is not configured: upgrading to Premium is disabled');
  }
  if (config.isProduction && !config.email.resendApiKey) {
    console.warn('[config] RESEND_API_KEY is not set: e-mails are only printed to the log');
  }

  const backups = config.backup.dir
    ? new BackupService(
        db,
        config.backup.dir,
        config.backup.retentionDays,
        console,
        config.databasePath
      )
    : null;
  backups?.start(config.backup.intervalHours);

  const cleanup = setInterval(
    () => {
      container.repos.refreshTokens.deleteExpired(new Date());
      // Funnel counters older than the retention period (docs/analitica.md).
      container.repos.funnel.purgeExpired();
    },
    6 * 60 * 60 * 1000
  );
  cleanup.unref();

  // The optional Monday summary: checked every hour, sent only on Monday mornings.
  const digest = setInterval(
    () => {
      container.weeklyDigest.run().catch((e) => console.error('[digest] run failed', e));
    },
    60 * 60 * 1000
  );
  digest.unref();

  // Push notifications (bills due tomorrow, Monday summary): hourly, each goes out once.
  const reminders = setInterval(
    () => {
      container.reminders.run().catch((e) => console.error('[push] reminders failed', e));
    },
    60 * 60 * 1000
  );
  reminders.unref();

  // Notices about the end of the 14-day trial: hourly, sent only in the morning, once per user.
  const trialNotices = setInterval(
    () => {
      container.trialNotices.run().catch((e) => console.error('[trial] notices failed', e));
    },
    60 * 60 * 1000
  );
  trialNotices.unref();

  // Crypto console: on the 1st (Madrid) the seasons are frozen, the top 5 is kept and the winner
  // gets a month of Premium; every hour it also keeps today's equity. Idempotent.
  const cryptoSeasons = setInterval(
    () => {
      container.cryptoRanking.run().catch((e) => console.error('[crypto] season job failed', e));
    },
    60 * 60 * 1000
  );
  cryptoSeasons.unref();
  container.cryptoRanking.run().catch((e) => console.error('[crypto] season job failed', e));

  // Price alerts of the crypto console (Premium): checked every five minutes, each sent once.
  const cryptoAlerts = setInterval(
    () => {
      container.cryptoAlerts.run().catch((e) => console.error('[crypto] alerts failed', e));
    },
    5 * 60 * 1000
  );
  cryptoAlerts.unref();

  const server = createApp(container).listen(config.port, () => {
    console.info(`Finanverso API listening on :${config.port} (${config.env})`);
  });

  const shutdown = (signal: string): void => {
    console.info(`[server] ${signal} received, shutting down`);
    backups?.stop();
    server.close(() => {
      db.pragma('optimize');
      db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => {
  console.error('[server] failed to start', e);
  process.exit(1);
});
