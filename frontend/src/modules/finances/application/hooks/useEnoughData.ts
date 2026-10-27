import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { todayDateOnly } from '@shared/utils/format';
import { hasEnoughData } from '../../domain/enoughData';
import { useFinances } from '../FinancesContext';

/** Whether the estimates of the month have enough movements behind them (see `hasEnoughData`). */
export function useEnoughData(): boolean {
  const { transactions } = useFinances();
  const total = useOptionalPlan()?.overview?.usage.movements ?? null;
  return hasEnoughData(transactions, total, todayDateOnly());
}
