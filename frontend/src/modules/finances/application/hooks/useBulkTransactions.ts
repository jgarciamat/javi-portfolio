import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { IApiContext } from '@core/context/ApiContext';
import type {
  Account,
  BulkResult,
  BulkTransactionChanges,
  Category,
  MonthOverview,
  Transaction,
} from '@modules/finances/domain/types';
import { notesAfter } from '@modules/finances/domain/transactionBulk';

interface Options {
  transactionApi: Pick<IApiContext['transactionApi'], 'bulkDelete' | 'bulkUpdate'>;
  setOverview: Dispatch<SetStateAction<MonthOverview | null>>;
  afterMutation: () => Promise<void>;
  categories: Category[];
  accounts: Account[];
}

/**
 * Bulk delete and bulk change of movements: the viewed month shows the result at once
 * (optimistic), then the month, its figures and the balances are read again, which also
 * undoes the preview if the request fails.
 */
export function useBulkTransactions({
  transactionApi,
  setOverview,
  afterMutation,
  categories,
  accounts,
}: Options) {
  const applyLocally = useCallback(
    (ids: string[], change: (tx: Transaction) => Transaction | null) => {
      const set = new Set(ids);
      setOverview((o) =>
        o
          ? {
              ...o,
              transactions: o.transactions.flatMap((tx) => {
                if (!set.has(tx.id)) return [tx];
                const next = change(tx);
                return next ? [next] : [];
              }),
            }
          : o
      );
    },
    [setOverview]
  );

  /** Runs a bulk request after the local preview; the reload fixes any difference (or failure). */
  const bulk = useCallback(
    async (request: () => Promise<BulkResult>) => {
      try {
        return await request();
      } finally {
        await afterMutation();
      }
    },
    [afterMutation]
  );

  const bulkDeleteTransactions = useCallback(
    async (ids: string[]) => {
      applyLocally(ids, () => null);
      return bulk(() => transactionApi.bulkDelete(ids));
    },
    [applyLocally, bulk, transactionApi]
  );

  const bulkUpdateTransactions = useCallback(
    async (ids: string[], changes: BulkTransactionChanges) => {
      const category = categories.find((c) => c.id === changes.categoryId);
      const account = accounts.find((a) => a.id === changes.accountId);
      applyLocally(ids, (tx) => ({
        ...tx,
        ...(changes.type && { type: changes.type }),
        ...(changes.date && { date: changes.date }),
        ...(category && { category: category.name, categoryId: category.id }),
        ...(account && { accountId: account.id, accountName: account.name }),
        ...(changes.notes !== undefined && {
          notes: notesAfter(
            tx.notes,
            changes.notes ?? '',
            changes.notesMode === 'append' ? 'append' : 'replace'
          ),
        }),
      }));
      return bulk(() => transactionApi.bulkUpdate(ids, changes));
    },
    [applyLocally, bulk, transactionApi, categories, accounts]
  );

  return { bulkDeleteTransactions, bulkUpdateTransactions };
}
