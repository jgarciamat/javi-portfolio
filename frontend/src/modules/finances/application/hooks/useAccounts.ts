import { useApi } from '@core/context/ApiContext';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import type { AccountInput, TransferInput } from '@modules/finances/domain/types';
import { useFinances } from '../FinancesContext';

/** Accounts with balances and the transfers between them. */
export function useAccounts() {
  const { accountApi } = useApi();
  const settings = useOptionalSettings();
  const { refresh, refreshAccounts } = useFinances();
  const resource = useResource(async () => {
    const [list, transfers] = await Promise.all([accountApi.getAll(), accountApi.transfers()]);
    return { ...list, transfers };
  }, [accountApi]);
  const action = useAction();

  /** Balances and the carry-over of every month may change: refresh everything. */
  const run = (change: () => Promise<unknown>) =>
    action.run(async () => {
      await change();
      await Promise.all([resource.reload(), refreshAccounts(), refresh({ invalidate: true })]);
    });

  return {
    accounts: resource.data?.accounts ?? [],
    total: resource.data?.total ?? 0,
    transfers: resource.data?.transfers ?? [],
    loading: resource.loading,
    error: action.error ?? resource.error,
    create: (input: AccountInput) => run(() => accountApi.create(input)),
    update: (id: string, input: Partial<AccountInput>) => run(() => accountApi.update(id, input)),
    remove: (id: string) => run(() => accountApi.delete(id)),
    setDefault: (id: string) =>
      run(async () => {
        await settings?.updateSettings({ defaultAccountId: id });
      }),
    createTransfer: (input: TransferInput) => run(() => accountApi.createTransfer(input)),
    deleteTransfer: (id: string) => run(() => accountApi.deleteTransfer(id)),
  };
}
