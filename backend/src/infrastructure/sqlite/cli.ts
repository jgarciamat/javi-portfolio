/* Database maintenance from the command line:
 *   npm run db:migrate   → applies pending migrations (the server also does it on start)
 *   npm run db:backup    → writes a consistent copy to BACKUP_DIR (or ./data/backups)
 *   npm run stats        → anonymous product counters for the last N days (default 30)
 *   npm run funnel       → anonymous funnel (by step, origin, campaign, guide and day), N days
 *   npm run creators     → creator affiliate program (report, add, off/on, paid, forget)
 *   In the production image (no ts-node): node dist/infrastructure/sqlite/cli.js funnel 30
 */
import dotenv from 'dotenv';
import { loadConfig } from '@config/env';
import { systemClock } from '@domain/ports/services';
import { formatStats } from './stats';
import { formatFunnel } from './funnelReport';
import { SqliteFunnelRepository } from './repositories/SqliteFunnelRepository';
import { BackupService } from '../backup/BackupService';
import { openDatabase } from './database';
import { SqliteMetricsRepository } from './repositories/SqliteMetricsRepository';
import { migrate } from './migrator';
import { migrations } from './migrations';
import { CreatorProgram } from '@application/creators/CreatorProgram';
import { SqliteCreatorRepository } from './repositories/SqliteCreatorRepository';
import { SqliteUserRepository } from './repositories/SqliteUserRepository';
import { runCreatorsCommand } from './creatorsCli';

async function run(command: string | undefined, arg?: string, ...rest: string[]): Promise<void> {
  dotenv.config();
  const config = loadConfig();
  const db = openDatabase(config.databasePath);
  try {
    if (command === 'migrate') {
      const result = migrate(db, migrations, {
        databaseFile: config.databasePath,
        logger: console,
      });
      console.info(`[db] schema version ${result.from} → ${result.to}`);
    } else if (command === 'backup') {
      const dir = config.backup.dir ?? './data/backups';
      const file = await new BackupService(db, dir, config.backup.retentionDays).runOnce();
      console.info(`[db] backup written to ${file}`);
    } else if (command === 'stats') {
      console.info(formatStats(new SqliteMetricsRepository(db, systemClock), Number(arg) || 30));
    } else if (command === 'funnel') {
      console.info(formatFunnel(new SqliteFunnelRepository(db, systemClock), Number(arg) || 30));
    } else if (command === 'creators') {
      const users = new SqliteUserRepository(db);
      const program = new CreatorProgram(
        new SqliteCreatorRepository(db),
        systemClock,
        config.creators
      );
      const args = arg === undefined ? [] : [arg, ...rest];
      try {
        console.info(
          runCreatorsCommand(
            { program, userIdByEmail: (email) => users.findByEmail(email)?.id ?? null },
            args
          )
        );
      } catch (e) {
        console.error((e as Error).message);
        process.exitCode = 1;
      }
    } else {
      console.error('Usage: cli.ts <migrate|backup|stats [days]|funnel [days]|creators …>');
      process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

run(process.argv[2], process.argv[3], ...process.argv.slice(4)).catch((e) => {
  console.error(e);
  process.exit(1);
});
