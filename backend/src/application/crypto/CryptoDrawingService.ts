import { Clock } from '@domain/ports/services';
import { CryptoDrawingRepository } from '@domain/ports/repositories';
import { CryptoDrawing, DRAWINGS_MAX } from '@domain/services/crypto-drawings';
import { CryptoSymbol } from '@domain/services/crypto-market';

export interface CryptoDrawingsView {
  symbol: string;
  drawings: CryptoDrawing[];
  max: number;
  /** When the list was last saved (null: never, or emptied). */
  updatedAt: string | null;
}

/**
 * The person's drawings on the chart of each coin (free for everybody, like the layers: a
 * reading aid). The app sends the whole list of a coin, already checked by the route's schema;
 * an empty list removes the row. The last save wins, from whichever device.
 */
export class CryptoDrawingService {
  constructor(
    private readonly repo: CryptoDrawingRepository,
    private readonly clock: Clock
  ) {}

  list(userId: string, symbol: CryptoSymbol): CryptoDrawingsView {
    const saved = this.repo.get(userId, symbol);
    return {
      symbol,
      drawings: saved?.drawings ?? [],
      max: DRAWINGS_MAX,
      updatedAt: saved?.updatedAt ?? null,
    };
  }

  save(userId: string, symbol: CryptoSymbol, drawings: CryptoDrawing[]): CryptoDrawingsView {
    if (drawings.length) {
      this.repo.save(userId, symbol, drawings, this.clock.now().toISOString());
    } else {
      this.repo.remove(userId, symbol);
    }
    return this.list(userId, symbol);
  }
}
