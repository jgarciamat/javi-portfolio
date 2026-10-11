import { Asset, AssetValue } from '@domain/ports/repositories';

/** Value of each asset on a date: its latest recorded value up to that day (0 before the first). */
export function assetTotalsAt(
  assets: Asset[],
  values: AssetValue[],
  date: string
): { assetsCents: number; debtsCents: number } {
  const latest = new Map<string, AssetValue>();
  for (const v of values) {
    if (v.date > date) continue;
    const current = latest.get(v.assetId);
    if (!current || v.date >= current.date) latest.set(v.assetId, v);
  }
  let assetsCents = 0;
  let debtsCents = 0;
  for (const asset of assets) {
    const value = latest.get(asset.id)?.valueCents ?? 0;
    if (asset.kind === 'debt') debtsCents += value;
    else assetsCents += value;
  }
  return { assetsCents, debtsCents };
}
