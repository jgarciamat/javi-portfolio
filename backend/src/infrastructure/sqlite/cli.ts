/* Database maintenance from the command line:
 *   npm run db:migrate   → applies pending migrations (the server also does it on start)
 *   npm run db:backup    → writes a consistent copy to BACKUP_DIR (or ./data/backups)
 *   npm run stats        → anonymous product counters for the last N days (default 30)
 */
import dotenv from 'dotenv';
import { loadConfig } from '@config/env';
import { systemClock } from '@domain/ports/services';
import { formatStats } from './stats';
import { BackupService } from '../backup/BackupService';
import { openDatabase } from './database';
import { SqliteMetricsRepository } from './repositories/SqliteMetricsRepository';
import { migrate } from './migrator';
import { migrations } from './migrations';

async function run(command: string | undefined, arg?: string): Promise<void> {
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
    } else {
      console.error('Usage: cli.ts <migrate|backup|stats [days]>');
      process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

run(process.argv[2], process.argv[3]).catch((e) => {
  console.error(e);
  process.exit(1);
});
