import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFinances } from '@modules/finances/application/FinancesContext';
import type { Account } from '@modules/finances/domain/types';
import { useAction } from '@shared/hooks/useAction';
import type { Simulator } from './useSimulator';

/** The icon of the account the console creates (the same one the movements' category has). */
export const CRYPTO_ACCOUNT_ICON = '🪙';

export interface AccountTransfer {
  /** The person's active accounts of type Criptomonedas, the only ones a result can go to. */
  accounts: Account[];
  busy: boolean;
  error: string | null;
  clearError: () => void;
  /** Adds the result once; then the balances, the month and the outlook are read again. */
  add: (positionId: string, accountId: string) => Promise<boolean>;
  /** Creates the account «Criptomonedas» (the plan's limit of accounts applies, as in Cuentas). */
  createAccount: () => Promise<boolean>;
}

/**
 * The result of a closed practice operation added to a real account: the accounts it can go to,
 * and the two actions, with their own state (the errors show inside the dialog, not behind it).
 */
export function useAccountTransfer(sim: Simulator): AccountTransfer {
  const { t } = useI18n();
  const { accountApi } = useApi();
  const { accounts, refresh, refreshAccounts } = useFinances();
  const action = useAction(t('app.crypto.transfer.error'));
  return {
    accounts: accounts.filter((a) => a.type === 'crypto' && !a.archived),
    busy: action.pending,
    error: action.error,
    clearError: () => action.setError(null),
    add: (positionId, accountId) =>
      action.run(async () => {
        await sim.addToAccount(positionId, accountId);
        // The movement changes the balances, the month and every figure made from them.
        await refresh({ invalidate: true });
      }),
    createAccount: () =>
      action.run(async () => {
        await accountApi.create({
          name: t('app.crypto.transfer.accountName'),
          type: 'crypto',
          icon: CRYPTO_ACCOUNT_ICON,
        });
        await refreshAccounts();
      }),
  };
}
