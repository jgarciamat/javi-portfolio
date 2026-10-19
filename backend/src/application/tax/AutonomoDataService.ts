import { ConflictError, PayloadTooLargeError, UnavailableError } from '@domain/errors';
import { AutonomoDataRepository } from '@domain/ports/autonomo-data';
import { Clock } from '@domain/ports/services';
import { SecretBox } from '@domain/ports/two-factor';

/** Largest form the account keeps, as JSON (over 4,000 invoices). */
export const AUTONOMO_DATA_MAX_BYTES = 1_000_000;

export interface AutonomoDataVersion {
  updatedAt: string;
  version: number;
}

export interface AutonomoDataView extends AutonomoDataVersion {
  /** Null when the stored copy cannot be decrypted (the server key changed). */
  data: unknown;
  unreadable: boolean;
}

/**
 * The self-employed form saved in the account, for everyone who turns it on (it is the user's own
 * data, not a Premium feature). Stored encrypted; each save says which version it was based on,
 * so a device with an old copy gets a conflict instead of overwriting a newer one.
 */
export class AutonomoDataService {
  constructor(
    private readonly repo: AutonomoDataRepository,
    /** Null without a usable key: nothing is stored then, never in clear. */
    private readonly box: SecretBox | null,
    private readonly clock: Clock
  ) {}

  get(userId: string): AutonomoDataView | null {
    const record = this.repo.find(userId);
    if (!record) return null;
    const plain = this.requireBox().decrypt(record.payloadEncrypted);
    const data = plain === null ? null : (JSON.parse(plain) as unknown);
    return {
      data,
      unreadable: plain === null,
      updatedAt: record.updatedAt,
      version: record.version,
    };
  }

  /** `baseVersion`: the version the device last read or wrote (null: it never had one). */
  save(userId: string, data: unknown, baseVersion: number | null): AutonomoDataVersion {
    const box = this.requireBox();
    const json = JSON.stringify(data);
    if (Buffer.byteLength(json, 'utf8') > AUTONOMO_DATA_MAX_BYTES) {
      throw new PayloadTooLargeError(
        'Los datos de autónomo son demasiado grandes para guardarlos en la cuenta',
        'AUTONOMO_DATA_TOO_LARGE',
        { maxBytes: AUTONOMO_DATA_MAX_BYTES }
      );
    }
    const current = this.repo.find(userId);
    const record = {
      userId,
      payloadEncrypted: box.encrypt(json),
      updatedAt: this.clock.now().toISOString(),
      version: (current?.version ?? 0) + 1,
    };
    if ((current?.version ?? null) !== baseVersion || !this.repo.save(record, baseVersion)) {
      // Read again: another save may have just won the race.
      const latest = this.repo.find(userId);
      throw new ConflictError(
        'Hay una copia más reciente en tu cuenta',
        'AUTONOMO_DATA_CONFLICT',
        latest ? { version: latest.version, updatedAt: latest.updatedAt } : { version: null }
      );
    }
    return { updatedAt: record.updatedAt, version: record.version };
  }

  /** Idempotent: deleting what is not there is fine. */
  delete(userId: string): void {
    this.repo.delete(userId);
  }

  private requireBox(): SecretBox {
    if (!this.box) {
      throw new UnavailableError(
        'Guardar en la cuenta no está disponible ahora mismo',
        'AUTONOMO_SYNC_UNAVAILABLE'
      );
    }
    return this.box;
  }
}
