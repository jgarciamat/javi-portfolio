import { randomUUID } from 'crypto';
import { NotFoundError, ValidationError } from '@domain/errors';
import { CategoryRepository, CategoryRuleRepository } from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { cleanPattern, matchRule, suggestPattern } from '@domain/services/category-rules';
import { CategoryResolver } from '@application/shared/resolvers';

export const PATTERN_MIN = 3;
export const PATTERN_MAX = 60;

export interface CategoryRuleView {
  id: string;
  pattern: string;
  categoryId: string;
  categoryName: string;
}

/** The rules a user taught ("Mercadona → Alimentación"), applied to imports and new movements. */
export class CategoryRuleService {
  constructor(
    private readonly rules: CategoryRuleRepository,
    private readonly categories: CategoryRepository,
    private readonly resolver: CategoryResolver,
    private readonly clock: Clock
  ) {}

  list(userId: string): CategoryRuleView[] {
    const names = new Map(this.categories.listByUser(userId).map((c) => [c.id, c.name]));
    // Deleting a category deletes its rules, so every rule has a category.
    return this.rules.listByUser(userId).map((r) => ({
      id: r.id,
      pattern: r.pattern,
      categoryId: r.categoryId,
      categoryName: names.get(r.categoryId) as string,
    }));
  }

  /** Creates the rule, or moves an existing one with the same text to the new category. */
  add(userId: string, input: { pattern: string; categoryId: string }): CategoryRuleView {
    const pattern = cleanPattern(input.pattern);
    if (pattern.length < PATTERN_MIN || pattern.length > PATTERN_MAX) {
      throw new ValidationError(
        `El texto debe tener entre ${PATTERN_MIN} y ${PATTERN_MAX} caracteres`,
        'RULE_PATTERN'
      );
    }
    const category = this.resolver.requireById(userId, input.categoryId);
    const saved = this.rules.save({
      id: randomUUID(),
      userId,
      pattern,
      categoryId: category.id,
      createdAt: this.clock.now().toISOString(),
    });
    return {
      id: saved.id,
      pattern: saved.pattern,
      categoryId: category.id,
      categoryName: category.name,
    };
  }

  remove(userId: string, id: string): void {
    if (!this.rules.delete(userId, id)) {
      throw new NotFoundError('Regla no encontrada', 'RULE_NOT_FOUND');
    }
  }

  /** Category id the rules give to a description, or null. Loads the rules once per call. */
  matcher(userId: string): (description: string) => string | null {
    const rules = this.rules.listByUser(userId);
    return (description) => matchRule(rules, description)?.categoryId ?? null;
  }

  /** What to offer when the user wants a rule for a movement: the merchant text and any match. */
  suggest(userId: string, description: string): { pattern: string; categoryId: string | null } {
    return { pattern: suggestPattern(description), categoryId: this.matcher(userId)(description) };
  }
}
