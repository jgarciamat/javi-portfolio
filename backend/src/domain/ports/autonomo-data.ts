/** The self-employed form of one user, saved in the account (only when the user turns it on). */
export interface AutonomoDataRecord {
  userId: string;
  /** The form as JSON, encrypted (SecretBox): never stored in clear. */
  payloadEncrypted: string;
  updatedAt: string;
  /** 1 on the first save, one more on each one after. */
  version: number;
}

export interface AutonomoDataRepository {
  find(userId: string): AutonomoDataRecord | null;
  /**
   * Writes the record only while the stored version is still `expected` (null: nothing stored),
   * so a save based on an old copy never overwrites a newer one. False when it was not written.
   */
  save(record: AutonomoDataRecord, expected: number | null): boolean;
  /** False when there was nothing to delete. */
  delete(userId: string): boolean;
}
