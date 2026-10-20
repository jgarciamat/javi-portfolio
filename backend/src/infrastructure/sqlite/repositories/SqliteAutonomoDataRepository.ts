import { AutonomoDataRecord, AutonomoDataRepository } from '@domain/ports/autonomo-data';
import { Db } from '../database';

interface Row {
  user_id: string;
  payload_enc: string;
  updated_at: string;
  version: number;
}

export class SqliteAutonomoDataRepository implements AutonomoDataRepository {
  constructor(private readonly db: Db) {}

  find(userId: string): AutonomoDataRecord | null {
    const row = this.db.prepare('SELECT * FROM autonomo_data WHERE user_id = ?').get(userId) as
      Row | undefined;
    return row
      ? {
          userId: row.user_id,
          payloadEncrypted: row.payload_enc,
          updatedAt: row.updated_at,
          version: row.version,
        }
      : null;
  }

  save(record: AutonomoDataRecord, expected: number | null): boolean {
    const values = [record.payloadEncrypted, record.updatedAt, record.version];
    // The version check and the write are one statement: no other save can slip in between.
    const result =
      expected === null
        ? this.db
            .prepare(
              `INSERT INTO autonomo_data (user_id, payload_enc, updated_at, version)
               VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO NOTHING`
            )
            .run(record.userId, ...values)
        : this.db
            .prepare(
              `UPDATE autonomo_data SET payload_enc = ?, updated_at = ?, version = ?
               WHERE user_id = ? AND version = ?`
            )
            .run(...values, record.userId, expected);
    return result.changes === 1;
  }

  delete(userId: string): boolean {
    return this.db.prepare('DELETE FROM autonomo_data WHERE user_id = ?').run(userId).changes > 0;
  }
}
