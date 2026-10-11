import { Asset, AssetValue } from '@domain/ports/repositories';
import { assetTotalsAt } from '@domain/services/net-worth';

const asset = (id: string, kind: Asset['kind']): Asset => ({
  id,
  userId: 'u',
  name: id,
  kind,
  createdAt: '2026-01-01T00:00:00Z',
});
const value = (assetId: string, date: string, valueCents: number): AssetValue => ({
  assetId,
  date,
  valueCents,
});

describe('assetTotalsAt', () => {
  const assets = [asset('fund', 'investment'), asset('loan', 'debt'), asset('flat', 'property')];
  const values = [
    value('fund', '2026-01-10', 1000),
    value('fund', '2026-03-10', 1500),
    value('loan', '2026-01-10', 5000),
    value('loan', '2026-03-10', 4000),
    value('flat', '2026-05-01', 90000),
  ];

  it('uses the latest value up to the date; nothing before the first one', () => {
    expect(assetTotalsAt(assets, values, '2026-01-09')).toEqual({ assetsCents: 0, debtsCents: 0 });
    expect(assetTotalsAt(assets, values, '2026-02-01')).toEqual({
      assetsCents: 1000,
      debtsCents: 5000,
    });
    expect(assetTotalsAt(assets, values, '2026-03-10')).toEqual({
      assetsCents: 1500,
      debtsCents: 4000,
    });
    expect(assetTotalsAt(assets, values, '2026-12-31')).toEqual({
      assetsCents: 91500,
      debtsCents: 4000,
    });
  });

  it('does not depend on the order of the values', () => {
    expect(assetTotalsAt(assets, [...values].reverse(), '2026-03-10').assetsCents).toBe(1500);
  });
});
