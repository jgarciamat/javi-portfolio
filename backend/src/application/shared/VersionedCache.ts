import { DataVersions } from '@domain/ports/services';

interface Entry<T> {
  version: number;
  value: T;
}

/** Entries kept at most by default (all users together); the least recently used go first. */
export const DEFAULT_CACHE_ENTRIES = 500;

/**
 * Keeps results worked out from a user's data while that data does not change: an entry is only
 * served while the user's data stamp is the one it was computed with. The key must hold every
 * other input of the result (day, plan, parameters…). Never shared between users: the user id is
 * part of every key. The cached values are shared by the callers, which must not change them.
 */
export class VersionedCache<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(
    private readonly versions: DataVersions,
    private readonly maxEntries = DEFAULT_CACHE_ENTRIES
  ) {}

  get(userId: string, key: string, compute: () => T): T {
    const id = `${userId}\u0000${key}`;
    const before = this.versions.of(userId);
    const hit = this.entries.get(id);
    if (hit) {
      this.entries.delete(id);
      if (before !== null && hit.version === before) {
        this.entries.set(id, hit); // most recently used again
        return hit.value;
      }
    }
    const value = compute();
    // Kept only when nothing was written while computing it (a write could have come after a
    // read), and outside of a transaction (it could still be rolled back).
    const after = this.versions.of(userId);
    if (before !== null && after === before) {
      this.entries.set(id, { version: after, value });
      if (this.entries.size > this.maxEntries) {
        this.entries.delete(this.entries.keys().next().value as string);
      }
    }
    return value;
  }

  /** How many entries are kept now (for tests and diagnostics). */
  get size(): number {
    return this.entries.size;
  }
}
