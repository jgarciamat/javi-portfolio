import fs from 'fs';
import path from 'path';
import { Db } from '../sqlite/database';

const PREFIX = 'money-manager-';

/**
 * Online backups with SQLite's backup API (consistent even while the app writes).
 * Files land in BACKUP_DIR; copy that directory off the server (rclone, restic…)
 * to have an off-site copy.
 */
export class BackupService {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: Db,
    private readonly dir: string,
    private readonly retentionDays: number,
    private readonly logger: Pick<Console, 'info' | 'error'> = console
  ) {}

  async runOnce(now = new Date()): Promise<string> {
    fs.mkdirSync(this.dir, { recursive: true });
    const file = path.join(this.dir, `${PREFIX}${now.toISOString().replace(/[:.]/g, '-')}.db`);
    await this.db.backup(file);
    this.prune(now);
    this.logger.info(`[backup] written ${file}`);
    return file;
  }

  prune(now = new Date()): string[] {
    const limit = now.getTime() - this.retentionDays * 24 * 60 * 60 * 1000;
    const removed: string[] = [];
    for (const name of fs.readdirSync(this.dir)) {
      if (!name.startsWith(PREFIX) || !name.endsWith('.db')) continue;
      const full = path.join(this.dir, name);
      if (fs.statSync(full).mtimeMs < limit) {
        fs.unlinkSync(full);
        removed.push(full);
      }
    }
    return removed;
  }

  start(intervalHours: number): void {
    const run = (): void => {
      this.runOnce().catch((e) => this.logger.error('[backup] failed', e));
    };
    run();
    this.timer = setInterval(run, intervalHours * 60 * 60 * 1000);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
