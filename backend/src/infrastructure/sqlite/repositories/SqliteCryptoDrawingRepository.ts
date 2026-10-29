import { CryptoDrawingRepository } from '@domain/ports/repositories';
import { CryptoDrawing } from '@domain/services/crypto-drawings';
import { Db } from '../database';

interface DrawingRow {
  drawings: string;
  updated_at: string;
}

/** Chart drawings of the crypto console (table `crypto_drawings`, migration 043). */
export class SqliteCryptoDrawingRepository implements CryptoDrawingRepository {
  constructor(private readonly db: Db) {}

  get(userId: string, symbol: string): { drawings: CryptoDrawing[]; updatedAt: string } | null {
    const row = this.db
      .prepare('SELECT drawings, updated_at FROM crypto_drawings WHERE user_id = ? AND symbol = ?')
      .get(userId, symbol) as DrawingRow | undefined;
    if (!row) return null;
    let drawings: unknown;
    try {
      drawings = JSON.parse(row.drawings);
    } catch {
      drawings = [];
    }
    // Only this API writes the column, already validated: a damaged value reads as no drawings.
    return {
      drawings: Array.isArray(drawings) ? (drawings as CryptoDrawing[]) : [],
      updatedAt: row.updated_at,
    };
  }

  save(userId: string, symbol: string, drawings: CryptoDrawing[], updatedAt: string): void {
    this.db
      .prepare(
        `INSERT INTO crypto_drawings (user_id, symbol, drawings, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (user_id, symbol)
         DO UPDATE SET drawings = excluded.drawings, updated_at = excluded.updated_at`
      )
      .run(userId, symbol, JSON.stringify(drawings), updatedAt);
  }

  remove(userId: string, symbol: string): void {
    this.db
      .prepare('DELETE FROM crypto_drawings WHERE user_id = ? AND symbol = ?')
      .run(userId, symbol);
  }
}
