import { useCallback } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { useResource } from '@shared/hooks/useResource';
import type { Category, CreateCategoryDTO } from '@modules/finances/domain/types';

interface CategoryApi {
  getAll: () => Promise<Category[]>;
  create: (dto: CreateCategoryDTO) => Promise<Category>;
  update: (id: string, dto: Partial<CreateCategoryDTO>) => Promise<Category>;
  delete: (id: string, reassignTo?: string) => Promise<void>;
}

const sortByName = (list: Category[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));

/** The user's categories, alphabetical, kept in sync with each change. */
export function useCategoryActions(categoryApi: CategoryApi) {
  const { token } = useAuth();
  const resource = useResource(() => categoryApi.getAll().then(sortByName), [categoryApi], {
    enabled: !!token,
    initial: [] as Category[],
  });
  const { setData } = resource;

  const addCategory = useCallback(
    async (dto: CreateCategoryDTO) => {
      const cat = await categoryApi.create(dto);
      setData((prev) => sortByName([...prev, cat]));
      return cat;
    },
    [categoryApi, setData]
  );

  /** Renames / recolours a category. Movements follow it because they reference its id. */
  const updateCategory = useCallback(
    async (id: string, dto: Partial<CreateCategoryDTO>) => {
      const cat = await categoryApi.update(id, dto);
      setData((prev) => sortByName(prev.map((c) => (c.id === id ? cat : c))));
      return cat;
    },
    [categoryApi, setData]
  );

  /** Throws ApiError CATEGORY_IN_USE when the category has data and no `reassignTo` is given. */
  const removeCategory = useCallback(
    async (id: string, reassignTo?: string) => {
      await categoryApi.delete(id, reassignTo);
      setData((prev) => prev.filter((c) => c.id !== id));
    },
    [categoryApi, setData]
  );

  return {
    categories: resource.data,
    addCategory,
    updateCategory,
    removeCategory,
    refreshCategories: resource.reload,
  };
}
