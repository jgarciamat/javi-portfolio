import { useCallback } from 'react';
import { useResource } from '@shared/hooks/useResource';

interface CrudApi<T, C, U, R extends unknown[]> {
  getAll: () => Promise<T[]>;
  create: (dto: C) => Promise<T>;
  update: (id: string, dto: U) => Promise<T>;
  delete: (id: string, ...rest: R) => Promise<void>;
}

/**
 * A list kept in sync with a REST collection: loaded once, then updated in
 * place with what each create / update / delete returns (no refetch).
 */
export function useCrudList<T extends { id: string }, C, U, R extends unknown[] = []>(
  api: CrudApi<T, C, U, R>,
  options: { enabled: boolean; fallbackError: string }
) {
  const resource = useResource(() => api.getAll(), [api], { ...options, initial: [] as T[] });
  const { setData } = resource;

  const create = useCallback(
    async (dto: C) => {
      const item = await api.create(dto);
      setData((prev) => [...prev, item]);
      return item;
    },
    [api, setData]
  );

  const update = useCallback(
    async (id: string, dto: U) => {
      const item = await api.update(id, dto);
      setData((prev) => prev.map((x) => (x.id === id ? item : x)));
      return item;
    },
    [api, setData]
  );

  const remove = useCallback(
    async (id: string, ...rest: R) => {
      await api.delete(id, ...rest);
      setData((prev) => prev.filter((x) => x.id !== id));
    },
    [api, setData]
  );

  return {
    items: resource.data,
    loading: resource.loading,
    error: resource.error,
    reload: resource.reload,
    create,
    update,
    remove,
  };
}
