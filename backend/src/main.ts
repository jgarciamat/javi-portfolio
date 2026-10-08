import dotenv from 'dotenv';
import { AppConfig, loadConfig } from '@config/env';
import { User } from '@domain/model/User';
import { Account, DEFAULT_ACCOUNT_NAME } from '@domain/model/Account';
import { defaultSettings } from '@domain/model/UserSettings';
import { buildContainer, Container } from '@infrastructure/container';
import { createApp } from '@infrastructure/http/app';
import { BackupService } from '@infrastructure/backup/BackupService';
import { openDatabase } from '@infrastructure/sqlite/database';
import { migrate } from '@infrastructure/sqlite/migrator';
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
  if (!config.billing.stripe) {
    console.info('[config] Stripe is not configured: upgrading to Premium is disabled');
  }
  if (config.isProduction && !config.email.resendApiKey) {
    console.warn('[config] RESEND_API_KEY is not set: e-mails are only printed to the log');
  }

  const backups = config.backup.dir
    ? new BackupService(db, config.backup.dir, config.backup.retentionDays)
    : null;
  backups?.start(config.backup.intervalHours);

  const cleanup = setInterval(
    () => container.repos.refreshTokens.deleteExpired(new Date()),
    6 * 60 * 60 * 1000
  );
  cleanup.unref();

  const server = createApp(container).listen(config.port, () => {
    console.info(`Money Manager API listening on :${config.port} (${config.env})`);
  });

  const shutdown = (signal: string): void => {
    console.info(`[server] ${signal} received, shutting down`);
    backups?.stop();
    server.close(() => {
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
