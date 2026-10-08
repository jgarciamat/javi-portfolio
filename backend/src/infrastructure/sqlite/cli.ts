/* Database maintenance from the command line:
 *   npm run db:migrate   → applies pending migrations (the server also does it on start)
 *   npm run db:backup    → writes a consistent copy to BACKUP_DIR (or ./data/backups)
 */
import dotenv from 'dotenv';
import { loadConfig } from '@config/env';
import { BackupService } from '../backup/BackupService';
import { openDatabase } from './database';
import { migrate } from './migrator';
import { migrations } from './migrations';

async function run(command: string | undefined): Promise<void> {
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
    } else {
      console.error('Usage: cli.ts <migrate|backup>');
      process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

run(process.argv[2]).catch((e) => {
  console.error(e);
  process.exit(1);
});
