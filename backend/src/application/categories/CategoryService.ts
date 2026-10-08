import { ConflictError, ValidationError } from '@domain/errors';
import { Category, CategoryProps } from '@domain/model/Category';
import { CategoryRepository, CategoryUsage, UnitOfWork } from '@domain/ports/repositories';
import { CategoryResolver } from '@application/shared/resolvers';
import { RecurringMaterializer } from '@application/recurring/RecurringMaterializer';

export class CategoryService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly resolver: CategoryResolver,
    private readonly materializer: RecurringMaterializer,
    private readonly uow: UnitOfWork
  ) {}

  list(userId: string): CategoryProps[] {
    return this.categories.listByUser(userId).map((c) => c.toPrimitives());
  }

  private assertNameFree(userId: string, name: string, exceptId?: string): void {
    const clash = this.categories.findByName(userId, name);
    if (clash && clash.id !== exceptId) {
      throw new ConflictError('Ya existe una categoría con ese nombre', 'CATEGORY_EXISTS');
    }
  }

  create(userId: string, input: { name: string; color?: string; icon?: string }): CategoryProps {
    const category = Category.create({ userId, ...input });
    this.assertNameFree(userId, category.name);
    this.categories.save(category);
    return category.toPrimitives();
  }

  /** Renaming is safe: movements reference the category by id. */
  update(
    userId: string,
    id: string,
    changes: { name?: string; color?: string; icon?: string }
  ): CategoryProps {
    const updated = this.resolver.requireById(userId, id).update(changes);
    this.assertNameFree(userId, updated.name, id);
    this.categories.save(updated);
    return updated.toPrimitives();
  }

  usage(userId: string, id: string): CategoryUsage {
    this.resolver.requireById(userId, id);
    return this.categories.usage(userId, id);
  }

  /**
   * Deletes a category. If anything uses it, the caller must say where those
   * references go (`reassignTo`); nothing is ever left pointing to nowhere.
   */
  delete(userId: string, id: string, reassignTo?: string): void {
    this.resolver.requireById(userId, id);
    const usage = this.categories.usage(userId, id);
    const inUse = Object.values(usage).some((n) => n > 0);
    if (inUse && !reassignTo) {
      throw new ConflictError(
        'La categoría está en uso. Elige a qué categoría mover sus datos.',
        'CATEGORY_IN_USE',
        { usage }
      );
    }
    if (reassignTo === id) {
      throw new ValidationError('Elige una categoría distinta para reasignar', 'SAME_CATEGORY');
    }
    if (reassignTo) this.resolver.requireById(userId, reassignTo);
    this.uow.run(() => {
      if (reassignTo && inUse) this.categories.reassign(userId, id, reassignTo);
      this.categories.delete(userId, id);
    });
    this.materializer.invalidate(userId);
  }
}
