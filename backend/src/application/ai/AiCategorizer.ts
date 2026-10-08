import { createHash } from 'crypto';
import { CategorySuggester } from '@domain/ports/services';
import { normalizeText } from '@domain/shared/text';
import { AiAllowance } from './AiAllowance';

const BATCH_SIZE = 50;
/** Distinct descriptions sent per import, so one big file cannot spend the daily budget. */
const MAX_PER_IMPORT = 200;
const CACHE_LIMIT = 5000;

/**
 * Suggests categories for imported movements that the file, the user's history
 * and the keyword rules could not place. Premium only; it does not count towards
 * the monthly analyses but does count towards the global daily budget. Answers are
 * kept in memory so the preview and the real import ask only once.
 */
export class AiCategorizer {
  private readonly cache = new Map<string, string | null>();

  constructor(
    private readonly suggester: CategorySuggester | null,
    private readonly allowance: AiAllowance,
    private readonly logger: Pick<Console, 'error'> = console
  ) {}

  /** Returns normalised description → category name, only for the descriptions it could place. */
  async suggest(
    userId: string,
    descriptions: string[],
    categories: string[]
  ): Promise<Map<string, string>> {
    const found = new Map<string, string>();
    if (!this.suggester || descriptions.length === 0 || categories.length === 0) return found;
    if (this.allowance.check(userId, 'background')) return found;

    const scope = createHash('sha256')
      .update(`${userId}|${[...categories].sort().join('|')}`)
      .digest('hex');
    const pending: string[] = [];
    const seen = new Set<string>();
    for (const description of descriptions) {
      const key = normalizeText(description);
      if (seen.has(key)) continue;
      seen.add(key);
      const cached = this.cache.get(`${scope}|${key}`);
      if (cached !== undefined) {
        if (cached) found.set(key, cached);
      } else if (pending.length < MAX_PER_IMPORT) {
        pending.push(description);
      }
    }

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      if (!this.allowance.budgetLeft()) break;
      const batch = pending.slice(i, i + BATCH_SIZE);
      try {
        const { suggestions, usage } = await this.suggester.suggestCategories(batch, categories);
        this.allowance.record(userId, 'background', usage);
        batch.forEach((description, j) => {
          const key = normalizeText(description);
          const suggestion = suggestions[j] ?? null;
          this.remember(`${scope}|${key}`, suggestion);
          if (suggestion) found.set(key, suggestion);
        });
      } catch (e) {
        this.logger.error('[import] AI categorisation failed, keeping the fallback', e);
        break;
      }
    }
    return found;
  }

  private remember(key: string, value: string | null): void {
    this.cache.set(key, value);
    if (this.cache.size > CACHE_LIMIT) this.cache.delete(this.cache.keys().next().value as string);
  }
}
