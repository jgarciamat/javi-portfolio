import { Asset, AssetValue } from '@domain/ports/repositories';
import { DebtPayment, debtOwedAt } from './debt';

/**
 * Value of each asset on a date: its latest recorded value up to that day (0 before the first).
 * A debt paid by an automatic operation (`payments`, by asset id) is what was owed after the
 * payments up to that day (see debt.ts).
 */
export function assetTotalsAt(
  assets: Asset[],
  values: AssetValue[],
  date: string,
  payments: ReadonlyMap<string, DebtPayment[]> = new Map()
): { assetsCents: number; debtsCents: number } {
  let assetsCents = 0;
  let debtsCents = 0;
  for (const asset of assets) {
    const own = values.filter((v) => v.assetId === asset.id);
    const value = debtOwedAt(own, payments.get(asset.id) ?? [], asset.interestRate, date);
    if (asset.kind === 'debt') debtsCents += value;
    else assetsCents += value;
  }
  return { assetsCents, debtsCents };
}
