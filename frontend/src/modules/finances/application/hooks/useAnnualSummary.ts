import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import { useResource } from '@shared/hooks/useResource';

export function useAnnualSummary(year: number) {
  const { transactionApi } = useApi();
  const { token } = useAuth();
  const { data, loading, error, reload } = useResource(
    () => transactionApi.getAnnual(year),
    [transactionApi, year],
    { enabled: !!token, fallbackError: 'Error al cargar resumen anual' }
  );
  return { data: data ?? null, loading, error, refresh: reload };
}
