import { useCallback } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import { useCrudList } from './useCrudList';

export function useRecurringRules() {
  const { recurringApi } = useApi();
  const { token } = useAuth();
  const list = useCrudList(recurringApi, {
    enabled: !!token,
    fallbackError: 'Error al cargar operaciones automáticas',
  });
  const { update } = list;

  const toggleActive = useCallback(
    async (id: string, active: boolean): Promise<void> => {
      await update(id, { active });
    },
    [update]
  );

  return {
    rules: list.items,
    loading: list.loading,
    error: list.error,
    createRule: list.create,
    updateRule: list.update,
    deleteRule: list.remove,
    toggleActive,
    refresh: list.reload,
  };
}
