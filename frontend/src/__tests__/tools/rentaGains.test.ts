import {
  addMonths,
  emptySavingsDetail,
  fifo,
  generalBaseOf,
  propertyGain,
  savingsOf,
  type AssetOps,
  type SavingsDetail,
} from '@modules/tools/domain/rentaGains';

const detail = (over: Partial<SavingsDetail>): SavingsDetail => ({
  ...emptySavingsDetail(),
  ...over,
});

/** Case 17 of the bank: 150 of 200 shares bought in two lots (FIFO) and a fund sold at a loss. */
const shares: AssetOps = {
  name: 'Acciones Ficticias',
  kind: 'listed',
  buys: [
    { date: '2021-05-04', units: 100, cost: 3010 },
    { date: '2019-03-01', units: 100, cost: 2010 },
  ],
  sells: [{ date: '2025-06-10', units: 150, proceeds: 5985 }],
};
const fund: AssetOps = {
  name: 'Fondo Ficticio',
  kind: 'fund',
  buys: [{ date: '2020-01-15', units: 50, cost: 9000 }],
  sells: [{ date: '2025-09-01', units: 50, proceeds: 8000 }],
};

describe('FIFO (LIRPF art. 37.2)', () => {
  it('sells the units bought first, with their share of the cost', () => {
    // 100 of the 2019 lot (2,010) + 50 of the 2021 lot (3,010 × 50/100 = 1,505) = 3,515.
    const [sale] = fifo(shares);
    expect(sale).toMatchObject({ cost: 3515, gain: 2470, deferred: 0, unmatched: 0 });
  });

  it('says which units no purchase covers, and never sells a lot bought after the sale', () => {
    const [sale] = fifo({
      name: 'X',
      kind: 'listed',
      buys: [
        { date: '2025-01-01', units: 10, cost: 100 },
        { date: '2025-12-01', units: 10, cost: 100 },
      ],
      sells: [{ date: '2025-06-01', units: 15, proceeds: 300 }],
    });
    expect(sale).toMatchObject({ cost: 100, unmatched: 5, gain: 200 });
  });

  it('defers a loss while the shares bought within two months are held (art. 33.5.f)', () => {
    const asset: AssetOps = {
      name: 'Y',
      kind: 'listed',
      buys: [
        { date: '2025-01-10', units: 10, cost: 1000 },
        { date: '2025-03-01', units: 10, cost: 800 },
      ],
      sells: [{ date: '2025-02-15', units: 10, proceeds: 700 }],
    };
    expect(fifo(asset)[0]).toMatchObject({ gain: -300, deferred: 300 });
    // Half of them still held: half of the loss waits.
    const half = {
      ...asset,
      sells: [...asset.sells, { date: '2025-11-02', units: 5, proceeds: 450 }],
    };
    expect(fifo(half)[0]).toMatchObject({ gain: -300, deferred: 150 });
    // All sold by the end of the year: the loss counts.
    const all = {
      ...asset,
      sells: [...asset.sells, { date: '2025-11-02', units: 10, proceeds: 900 }],
    };
    const [first, second] = fifo(all);
    expect(first.deferred).toBe(0);
    expect(second).toMatchObject({ cost: 800, gain: 100, deferred: 0 });
    // Unlisted shares: one year before or after (art. 33.5.g).
    const unlisted: AssetOps = {
      ...asset,
      kind: 'unlisted',
      buys: [asset.buys[0], { date: '2025-10-01', units: 10, cost: 800 }],
    };
    expect(fifo(unlisted)[0].deferred).toBe(300);
    expect(fifo({ ...unlisted, kind: 'listed' })[0].deferred).toBe(0);
    // A purchase early next year, within the two months, also defers it.
    const next = {
      ...asset,
      buys: [asset.buys[0], { date: '2026-01-20', units: 10, cost: 800 }],
      sells: [{ date: '2025-12-01', units: 10, proceeds: 700 }],
    };
    expect(fifo(next)[0].deferred).toBe(300);
  });

  it('only warns about repurchases of funds and crypto, whose rule is not confirmed', () => {
    const coin: AssetOps = {
      name: 'Z',
      kind: 'crypto',
      buys: [
        { date: '2025-01-10', units: 1, cost: 1000 },
        { date: '2025-02-20', units: 1, cost: 600 },
      ],
      sells: [{ date: '2025-02-15', units: 1, proceeds: 500 }],
    };
    expect(fifo(coin)[0]).toMatchObject({
      gain: -500,
      deferred: 0,
      checkRepurchase: true,
    });
    expect(fifo({ ...coin, buys: [coin.buys[0]] })[0].checkRepurchase).toBe(false);
  });

  it('adds months keeping the end of the month', () => {
    expect(addMonths('2025-12-31', 2)).toBe('2026-02-28');
    expect(addMonths('2025-03-15', -2)).toBe('2025-01-15');
    expect(addMonths('2024-03-31', -1)).toBe('2024-02-29');
  });
});

describe('the sale of a property', () => {
  it('takes the expenses and the depreciation into the values (art. 35)', () => {
    // Case 20: inherited for 100,000 + 1,500, sold for 130,000 − 4,000.
    expect(
      propertyGain({
        name: 'Piso',
        proceeds: 126000,
        cost: 101500,
        amortization: 0,
        exemption: 'none',
      })
    ).toEqual({
      name: 'Piso',
      gain: 24500,
      exempt: 0,
      taxable: 24500,
    });
    expect(
      propertyGain({
        name: 'P',
        proceeds: 120000,
        cost: 100000,
        amortization: 10000,
        exemption: 'none',
      }).gain
    ).toBe(30000);
  });

  it('exempts the main home of someone of 65 or more, and the part reinvested', () => {
    expect(
      propertyGain({
        name: 'P',
        proceeds: 180000,
        cost: 100000,
        amortization: 0,
        exemption: 'homeOver65',
      })
    ).toMatchObject({ gain: 80000, exempt: 80000, taxable: 0 });
    // 200,000 − 50,000 of loan = 150,000 obtained; 75,000 reinvested: half the gain is exempt.
    expect(
      propertyGain({
        name: 'P',
        proceeds: 200000,
        cost: 100000,
        amortization: 0,
        exemption: 'reinvested',
        reinvested: 75000,
        pendingLoan: 50000,
      })
    ).toMatchObject({ gain: 100000, exempt: 50000, taxable: 50000 });
    // Nothing obtained after the loan: all of it counts as reinvested.
    expect(
      propertyGain({
        name: 'P',
        proceeds: 200000,
        cost: 100000,
        amortization: 0,
        exemption: 'reinvested',
        pendingLoan: 250000,
      }).exempt
    ).toBe(100000);
    // Without the amount reinvested nothing is exempt; without a loan, all the price counts.
    expect(
      propertyGain({
        name: 'P',
        proceeds: 200000,
        cost: 100000,
        amortization: 0,
        exemption: 'reinvested',
      }).exempt
    ).toBe(0);
    expect(
      propertyGain({
        name: 'P',
        proceeds: 200000,
        cost: 100000,
        amortization: 0,
        exemption: 'reinvested',
        reinvested: 100000,
      }).exempt
    ).toBe(50000);
    // A loss is never exempt.
    expect(
      propertyGain({
        name: 'P',
        proceeds: 90000,
        cost: 100000,
        amortization: 0,
        exemption: 'homeOver65',
      })
    ).toMatchObject({ gain: -10000, exempt: 0, taxable: -10000 });
  });
});

describe('the savings base (LIRPF art. 49)', () => {
  it('nets the gains among themselves and adds the capital (case 17)', () => {
    const r = savingsOf(
      detail({
        capital: { interest: 300, dividends: 0, assets: 0, insurance: 0, expenses: 0 },
        assets: [shares, fund],
      }),
      2025
    );
    expect(r.boxes).toMatchObject({
      '0422': 2470,
      '0423': 1000,
      '0424': 1470,
      '0429': 300,
      '0460': 1770,
    });
  });

  it('takes 25 % of the capital for a negative balance of gains and keeps the rest (case 18)', () => {
    const btc: AssetOps = {
      name: 'BTC',
      kind: 'crypto',
      buys: [
        { date: '2023-01-01', units: 0.5, cost: 10000 },
        { date: '2024-01-01', units: 0.5, cost: 20000 },
      ],
      sells: [{ date: '2025-04-01', units: 0.6, proceeds: 17950 }],
    };
    const eth: AssetOps = {
      name: 'ETH',
      kind: 'crypto',
      buys: [{ date: '2024-02-01', units: 3, cost: 9000 }],
      sells: [{ date: '2025-05-01', units: 3, proceeds: 4000 }],
    };
    const r = savingsOf(
      detail({
        capital: { interest: 1000, dividends: 0, assets: 0, insurance: 0, expenses: 0 },
        assets: [btc, eth],
      }),
      2025
    );
    expect(r.sales.map((s) => s.gain)).toEqual([3950, -5000]);
    expect(r.boxes).toMatchObject({ '0425': 1050, '0429': 1000, '0446': 250, '0460': 750 });
    expect(r.carryForward.gains).toEqual([{ year: 2025, amount: 800 }]);
  });

  it('takes a negative capital off the gains up to 25 %, after the expenses', () => {
    const r = savingsOf(
      detail({
        capital: { interest: 100, dividends: 200, assets: -1500, insurance: 50, expenses: 50 },
        otherGains: [2000],
      }),
      2025
    );
    expect(r.boxes).toMatchObject({
      '0036': -1150,
      '0037': 50,
      '0041': -1200,
      '0430': 1200,
      '0436': 500,
    });
    expect(r.boxes['0460']).toBe(1500);
    expect(r.carryForward.capital).toEqual([{ year: 2025, amount: 700 }]);
  });

  it('uses the balances of the four years before, the oldest first and each on its own part first', () => {
    const r = savingsOf(
      detail({
        otherGains: [1000],
        capital: { interest: 400, dividends: 0, assets: 0, insurance: 0, expenses: 0 },
        pending: {
          gains: [
            { year: 2024, amount: 300 },
            { year: 2021, amount: 500 },
            { year: 2020, amount: 999 },
          ],
          capital: [],
          general: [],
        },
      }),
      2025
    );
    expect(r.boxes.pendingGainsOnGains).toBe(800);
    expect(r.boxes['0460']).toBe(600);
    expect(r.carryForward.gains).toEqual([]);
    // More earlier losses than gains: the rest goes against 25 % of the capital; 2021 runs out now.
    const more = savingsOf(
      detail({
        otherGains: [1000],
        capital: { interest: 400, dividends: 0, assets: 0, insurance: 0, expenses: 0 },
        pending: {
          gains: [
            { year: 2021, amount: 1050 },
            { year: 2023, amount: 200 },
          ],
          capital: [],
          general: [],
        },
      }),
      2025
    );
    expect(more.boxes.pendingGainsOnGains).toBe(1000);
    expect(more.boxes.pendingGainsOnCapital).toBe(100);
    expect(more.boxes['0460']).toBe(300);
    expect(more.carryForward.gains).toEqual([{ year: 2023, amount: 150 }]);
    // Earlier negative capital: first against the capital, the rest against 25 % of the gains.
    const capital = savingsOf(
      detail({
        otherGains: [2000],
        capital: { interest: 100, dividends: 0, assets: 0, insurance: 0, expenses: 0 },
        pending: { gains: [], capital: [{ year: 2022, amount: 1000 }], general: [] },
      }),
      2025
    );
    expect(capital.boxes.pendingCapitalOnCapital).toBe(100);
    expect(capital.boxes.pendingCapitalOnGains).toBe(500);
    expect(capital.boxes['0460']).toBe(1500);
    expect(capital.carryForward.capital).toEqual([{ year: 2022, amount: 400 }]);
  });

  it('leaves out the sales of other years and counts properties and other gains', () => {
    const old: AssetOps = { ...shares, sells: [{ date: '2024-06-10', units: 50, proceeds: 2000 }] };
    const r = savingsOf(
      detail({
        assets: [old],
        properties: [
          { name: 'P', proceeds: 126000, cost: 101500, amortization: 0, exemption: 'none' },
        ],
        otherGains: [-500],
        generalGains: [300, -100],
      }),
      2025
    );
    expect(r.sales).toEqual([]);
    expect(r.boxes).toMatchObject({
      '0422': 24500,
      '0423': 500,
      '0460': 24000,
      '0418': 300,
      '0419': 100,
    });
    expect(r.general).toEqual({ positive: 200, negative: 0, pending: [] });
  });
});

describe('figures that are not numbers', () => {
  it('count as zero', () => {
    const r = savingsOf(
      detail({
        capital: {
          interest: Number.NaN,
          dividends: 0,
          assets: Number.NaN,
          insurance: 0,
          expenses: 0,
        },
        otherGains: [Number.NaN, 100],
      }),
      2025
    );
    expect(r.boxes['0460']).toBe(100);
  });
});

describe('gains of the general base (LIRPF art. 48)', () => {
  it('takes a negative balance off up to 25 % of the other income and keeps the rest', () => {
    const r = savingsOf(detail({ generalGains: [1000, -3000] }), 2025);
    expect(r.boxes['0421']).toBe(2000);
    expect(generalBaseOf(20000, r.general, 2025)).toMatchObject({
      base: 18000,
      '0433': 2000,
      carry: [],
    });
    const big = savingsOf(detail({ generalGains: [-10000] }), 2025);
    expect(generalBaseOf(20000, big.general, 2025)).toMatchObject({
      base: 15000,
      '0433': 5000,
      carry: [{ year: 2025, amount: 5000 }],
    });
    expect(generalBaseOf(-100, big.general, 2025).base).toBe(-100);
  });

  it('uses the earlier balances against the gains and then within the 25 %', () => {
    const r = savingsOf(
      detail({
        generalGains: [3000],
        pending: { gains: [], capital: [], general: [{ year: 2023, amount: 4000 }] },
      }),
      2025
    );
    expect(generalBaseOf(20000, r.general, 2025)).toMatchObject({
      base: 19000,
      '0431': 3000,
      '0434': 1000,
      carry: [],
    });
  });
});
