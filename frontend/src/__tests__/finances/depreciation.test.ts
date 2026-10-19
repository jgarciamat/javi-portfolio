import {
  depreciationYear,
  investmentGoodsOf,
  tableOf,
  type Asset,
} from '@modules/finances/domain/depreciation';
import { subsidyYear } from '@modules/finances/domain/subsidies';

/**
 * Depreciation and grants worked out by hand (art. 30.1.ª RIRPF, simplified table of the Orden de
 * 27-3-1998; art. 12 LIS; anexo I of the Orden HAC/1425/2025 for modules), by whole months as the
 * Manual's example does: a laptop put to work on 1 April is in service 9 months of 2026.
 */
const laptop: Asset = {
  name: 'Portátil',
  group: 's5',
  cost: 1500,
  start: '2026-04-01',
  use: 100,
  method: 'table',
};

const one = (
  asset: Partial<Asset>,
  year = 2026,
  modality: 'simplified' | 'normal' | 'modules' = 'simplified'
) => depreciationYear([{ ...laptop, ...asset }], year, modality).assets[0];

describe('Depreciation of the assets of the activity', () => {
  it('is the table coefficient for the days in service, quarter by quarter', () => {
    // 1,500 × 26 % = 390 a year × 9/12 = 292.50, 97.50 a quarter from April
    const year = depreciationYear([laptop], 2026, 'simplified');
    expect(year.assets[0].quarters).toEqual([0, 97.5, 97.5, 97.5]);
    expect(year.quarters).toEqual([0, 97.5, 97.5, 97.5]);
    expect([year.tangible, year.intangible, year.total]).toEqual([292.5, 0, 292.5]);
    expect(year.assets[0]).toMatchObject({
      rate: 26,
      base: 1500,
      accumulated: 292.5,
      pending: 1207.5,
    });
    // Put to work on 15 April: from May, 8 months = 260 (65 in the second quarter)
    expect(one({ start: '2026-04-15' }).quarters).toEqual([0, 65, 97.5, 97.5]);
  });

  it('works out what earlier years deducted, and stops at the cost', () => {
    // 2027: a whole year, 390; accumulated 292.50 + 390 = 682.50
    expect(one({}, 2027)).toMatchObject({ amount: 390, accumulated: 682.5 });
    // Útiles (30 %) of 1,000 from 2020: 300 a year, fully depreciated in 2023 (100 that year)
    const tools = { group: 's6', cost: 1000, start: '2020-01-01' };
    expect(one(tools, 2023)).toMatchObject({ amount: 100, pending: 0 });
    expect(one(tools, 2026)).toMatchObject({ amount: 0, accumulated: 1000 });
    // Typed accumulated: 1,400 of 1,500 leaves 100
    expect(one({ start: '2024-01-01', accumulated: 1400 }, 2026).amount).toBe(100);
    expect(one({ start: '2024-01-01', accumulated: 9000 }, 2026).amount).toBe(0);
  });

  it('doubles the coefficient for the small-business incentive and for used assets', () => {
    // 1,500 × 52 % × 9/12 = 585
    expect(one({ method: 'accelerated' }).amount).toBe(585);
    expect(one({ used: true }).amount).toBe(585);
    expect(one({ used: true, method: 'free300' }).notes).toEqual(['usedIncentive']);
  });

  it('writes off at once a new asset of up to 300 €, up to 25,000 € a year', () => {
    expect(one({ cost: 250, method: 'free300' })).toMatchObject({
      quarters: [0, 250, 0, 0],
      amount: 250,
      rate: 100,
    });
    // A dearer one follows the table.
    expect(one({ method: 'free300' })).toMatchObject({ amount: 292.5, notes: ['freeTooDear'] });
    // Bought before: already written off.
    expect(one({ cost: 250, method: 'free300', start: '2025-03-01' }).amount).toBe(0);
    // Modules: 601.01 € each, 3,005.06 € a year: the sixth of six of 600 € goes to the table (40 %).
    const six = Array.from({ length: 6 }, () => ({
      ...laptop,
      group: 'm2',
      cost: 600,
      start: '2026-01-01',
      method: 'free300' as const,
    }));
    const year = depreciationYear(six, 2026, 'modules');
    expect(year.assets.map((a) => a.amount)).toEqual([600, 600, 600, 600, 600, 240]);
    expect(year.assets[5].notes).toEqual(['freeLimit']);
  });

  it('keeps the chosen coefficient between the minimum and the maximum', () => {
    // Mobiliario (10 %, 20 years): 1 % is raised to 5 %; 30 % is lowered to 10 %; 8 % stays.
    const desk = { group: 's2', cost: 1000, start: '2026-01-01' };
    expect(one({ ...desk, rate: 1 })).toMatchObject({ rate: 5, amount: 50, notes: ['rateLow'] });
    expect(one({ ...desk, rate: 30 })).toMatchObject({
      rate: 10,
      amount: 100,
      notes: ['rateHigh'],
    });
    expect(one({ ...desk, rate: 8 }).amount).toBe(80);
  });

  it('takes a building without its land and by the part used, and nothing else in part', () => {
    // (200,000 − 60,000) × 25 % = 35,000 × 3 % = 1,050; accumulated with 2025 = 2,100
    const home = { group: 's1', cost: 200000, land: 60000, use: 25, start: '2025-01-01' };
    expect(one(home)).toMatchObject({ base: 35000, amount: 1050, accumulated: 2100 });
    expect(one({ use: 50 })).toMatchObject({ amount: 0, notes: ['notAffected'] });
    expect(one({ use: 0 })).toMatchObject({ amount: 0, notes: [] });
    expect(one({ use: 150 }).amount).toBe(292.5);
  });

  it('depreciates intangibles over their life or at 5 % a year', () => {
    const brand = { group: 'intangible', cost: 4000, start: '2026-01-01' };
    expect(one({ ...brand, life: 4 })).toMatchObject({ amount: 1000, intangible: true, rate: 25 });
    expect(one(brand).amount).toBe(200);
    const year = depreciationYear([{ ...laptop, ...brand }, laptop], 2026, 'normal');
    // The laptop's group is not in the normal table.
    expect([year.intangible, year.tangible]).toEqual([200, 0]);
    expect(year.assets[1].notes).toEqual(['unknownGroup']);
  });

  it('uses the official table in the normal modality and the modules one in modules', () => {
    // 1,500 × 25 % × 9/12 = 281.25; modules 1,500 × 40 % × 9/12 = 450
    expect(one({ group: 'computers' }, 2026, 'normal').amount).toBe(281.25);
    expect(one({ group: 'm2', method: 'accelerated' }, 2026, 'modules')).toMatchObject({
      amount: 450,
      notes: ['noIncentive'],
    });
    expect(tableOf('modules')).toHaveLength(10);
  });

  it('leaves out the assets of later years and those without a cost', () => {
    const year = depreciationYear(
      [
        { ...laptop, start: '2027-01-01' },
        { ...laptop, cost: 0 },
      ],
      2026,
      'simplified'
    );
    expect(year.assets).toEqual([]);
  });

  it('gives the investment goods of earlier years to the VAT regularisation', () => {
    const assets: Asset[] = [
      { ...laptop, cost: 5000, start: '2024-05-01', vat: 1050, vatPct: 60 },
      { ...laptop, group: 's1', cost: 90000, start: '2023-01-01', vat: 18900 },
      { ...laptop, cost: 2000, start: '2024-05-01', vat: 420 },
      { ...laptop, cost: 5000, start: '2026-01-01', vat: 1050 },
      { ...laptop, cost: 5000, start: '2024-01-01' },
    ];
    expect(investmentGoodsOf(assets, 2026, 'simplified')).toEqual([
      { year: 2024, vat: 1050, pct: 60, realEstate: false },
      { year: 2023, vat: 18900, pct: 100, realEstate: true },
    ]);
  });
});

describe('Grants of the activity', () => {
  const dep = depreciationYear([laptop], 2026, 'simplified');

  it('counts current grants in their quarter and leaves the exempt ones out', () => {
    const year = subsidyYear(
      [
        { name: 'Ayuda', kind: 'current', amount: 1000, year: 2026, quarter: 2 },
        { name: 'Otra', kind: 'current', amount: 1000, year: 2025, quarter: 2 },
        { name: 'Arranque', kind: 'exempt', amount: 500, year: 2026, quarter: 9 },
        { name: 'Vieja', kind: 'exempt', amount: 500, year: 2025, quarter: 1 },
        { name: 'Cero', kind: 'current', amount: 0, year: 2026, quarter: 1 },
      ],
      2026,
      dep
    );
    expect(year).toMatchObject({ current: 1000, capital: 0, exempt: 500, unassigned: 0 });
    expect(year.quarters).toEqual([0, 1000, 0, 0]);
  });

  it('imputes a quarter of the young farmers aid each of four years', () => {
    const aid = (amount: number, y: number) =>
      subsidyYear([{ name: 'Joven', kind: 'youngFarmer', amount, year: 2024, quarter: 3 }], y, dep);
    expect(aid(10000, 2024).quarters).toEqual([0, 0, 2500, 0]);
    expect(aid(10000, 2026).quarters).toEqual([2500, 0, 0, 0]);
    // The last year takes the cents left: 10,000.01 → 2,500 three times and 2,500.01.
    expect(aid(10000.01, 2027).current).toBe(2500.01);
    expect(aid(10000, 2028).current).toBe(0);
    expect(aid(10000, 2023).current).toBe(0);
  });

  it('imputes a capital grant as its asset is depreciated', () => {
    // 600 × 292.50 / 1,500 = 117, quarter by quarter on the cumulative depreciation
    const year = subsidyYear(
      [
        { name: 'Equipos', kind: 'capital', amount: 600, year: 2026, quarter: 2, asset: 0 },
        { name: 'Terreno', kind: 'capital', amount: 900, year: 2026, quarter: 1, asset: null },
        { name: 'Antigua', kind: 'capital', amount: 900, year: 2025, quarter: 1 },
      ],
      2026,
      dep
    );
    expect(year.capitalQuarters).toEqual([0, 39, 39, 39]);
    expect([year.capital, year.unassigned]).toEqual([117, 900]);
  });
});
