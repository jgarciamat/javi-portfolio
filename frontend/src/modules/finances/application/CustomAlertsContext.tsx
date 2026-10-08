import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAuth } from '@shared/hooks/useAuth';
import type {
  CreateCustomAlertDTO,
  CustomAlert,
  UpdateCustomAlertDTO,
} from '@modules/finances/domain/types';
import { useCrudList } from './hooks/useCrudList';

interface CustomAlertsContextValue {
  alerts: CustomAlert[];
  loading: boolean;
  error: string | null;
  createAlert: (dto: CreateCustomAlertDTO) => Promise<CustomAlert>;
  updateAlert: (id: string, dto: UpdateCustomAlertDTO) => Promise<CustomAlert>;
  deleteAlert: (id: string) => Promise<void>;
  toggleActive: (id: string, active: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const CustomAlertsContext = createContext<CustomAlertsContextValue | null>(null);

/**
 * The user's custom alerts, loaded once and shared by the month banner and the
 * alerts section (they used to request the list every time either was shown).
 */
export function CustomAlertsProvider({ children }: { children: ReactNode }) {
  const { customAlertApi } = useApi();
  const { token } = useAuth();
  const list = useCrudList(customAlertApi, {
    enabled: !!token,
    fallbackError: 'Error al cargar alertas personalizadas',
  });
  const { update } = list;

  const toggleActive = useCallback(
    async (id: string, active: boolean) => {
      await update(id, { active });
    },
    [update]
  );

  const value = useMemo<CustomAlertsContextValue>(
    () => ({
      alerts: list.items,
      loading: list.loading,
      error: list.error,
      createAlert: list.create,
      updateAlert: list.update,
      deleteAlert: list.remove,
      toggleActive,
      refresh: list.reload,
    }),
    [
      list.items,
      list.loading,
      list.error,
      list.create,
      list.update,
      list.remove,
      list.reload,
      toggleActive,
    ]
  );

  return <CustomAlertsContext.Provider value={value}>{children}</CustomAlertsContext.Provider>;
}

export function useCustomAlerts(): CustomAlertsContextValue {
  const ctx = useContext(CustomAlertsContext);
  if (!ctx) throw new Error('useCustomAlerts must be used inside CustomAlertsProvider');
  return ctx;
}
