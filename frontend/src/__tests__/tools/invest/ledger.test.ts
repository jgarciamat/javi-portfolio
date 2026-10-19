/**
 * The tax engine of the investment import, with figures worked out by hand (formula in each test).
 * Rules: LIRPF arts. 25, 33, 35, 37, 46, 80 and 94 (BOE-A-2006-20764) and the AEAT help on virtual
 * currencies of Renta 2025, checked 19-10-2026. Every operation is made up.
 */
import { buildLedger, inferPrices, swapsOnChain } from '@modules/tools/domain/invest/ledger';
import type { InvestOp } from '@modules/tools/domain/invest/types';

let n = 0;
const op = (o: Partial<InvestOp> & Pick<InvestOp, 'kind' | 'date' | 'asset'>): InvestOp => ({
  id: `t:${++n}`,
  format: 'test',
  account: 'Binance',
  at: `${o.date}T12:00:00`,
  assetClass: 'crypto',
  units: 1,
  amount: null,
  currency: 'EUR',
  eur: null,
  fee: 0,
  feeCurrency: null,
  ...o,
});
const rates = { USD: [['2020-01-01', 1.25]] as [string, number][] };
const codes = (l: ReturnType<typeof buildLedger>) => l.warnings.map((w) => w.code);

describe('crypto: FIFO for all the platforms, swaps and fees', () => {
  const ops = [
    op({ kind: 'buy', date: '2024-01-10', asset: 'BTC', amount: 20000, fee: 20 }),
    op({
      kind: 'buy',
      date: '2024-06-01',
      asset: 'BTC',
      account: 'Coinbase',
      amount: 30000,
      fee: 30,
    }),
    op({ kind: 'buy', date: '2024-12-01', asset: 'BTC', units: 0.5, amount: 10000 }),
    op({
      kind: 'sell',
      date: '2025-03-01',
      asset: 'BTC',
      account: 'Kraken',
      units: 1.5,
      amount: 60000,
      fee: 60,
    }),
    op({
      kind: 'swap',
      date: '2025-04-01',
      asset: 'BTC',
      units: 0.25,
      amount: 15000,
      toAsset: 'ETH',
      toUnits: 5,
      toEur: 15500,
      toClass: 'crypto',
      fee: 0.05,
      feeCurrency: 'ETH',
    }),
    op({ kind: 'sell', date: '2025-05-01', asset: 'ETH', units: 4.95, amount: 14000 }),
  ];
  const l = buildLedger(ops, { year: 2025, rates: {} });

  it('sells the oldest coins first, whatever the platform (AEAT help: "distintas casas de cambio")', () => {
    // Proceeds 60,000 − 60 = 59,940; cost 20,000 + 20 + 0.5 × (30,000 + 30) = 35,035.
    expect(l.sales[0]).toMatchObject({
      proceeds: 59940,
      cost: 35035,
      gain: 24905,
      counterpart: 'F',
    });
    expect(l.sales[0].lots).toEqual([
      { date: '2024-01-10', units: 1, cost: 20020 },
      { date: '2024-06-01', units: 0.5, cost: 15015 },
    ]);
  });

  it('values a swap at the higher of the two market values, which is the cost of what is received', () => {
    // max(15,000, 15,500) = 15,500; cost 0.25 × 30,030 = 7,507.50; gain 7,992.50.
    expect(l.sales[1]).toMatchObject({
      proceeds: 15500,
      cost: 7507.5,
      gain: 7992.5,
      counterpart: 'N',
    });
    // ETH sold for 14,000 with the cost of the swap: −1,500.
    expect(l.sales[2]).toMatchObject({ cost: 15500, gain: -1500 });
    expect(l.imported.assets.map((a) => a.name)).toEqual(['BTC', 'ETH']);
    expect(l.years[2025].savings).toBe(31397.5);
    expect(l.years[2024]).toBeUndefined();
  });

  it('a fee in the coin bought lowers the units, a fee in a third coin leaves without a sale', () => {
    const r = buildLedger(
      [
        op({ kind: 'buy', date: '2025-01-01', asset: 'BNB', units: 1, amount: 500 }),
        op({
          kind: 'buy',
          date: '2025-01-02',
          asset: 'BTC',
          units: 0.1,
          amount: 3000,
          fee: 0.001,
          feeCurrency: 'BTC',
        }),
        op({
          kind: 'buy',
          date: '2025-01-03',
          asset: 'ETH',
          units: 1,
          amount: 3000,
          fee: 0.01,
          feeCurrency: 'BNB',
        }),
        op({ kind: 'sell', date: '2025-02-01', asset: 'BTC', units: 0.099, amount: 3500 }),
      ],
      { year: 2025, rates: {} }
    );
    expect(r.sales[0]).toMatchObject({ cost: 3000, gain: 500, unmatched: 0 });
    expect(codes(r)).toContain('feeInCoins');
    expect(r.holdings.find((h) => h.asset === 'BNB')?.units).toBeCloseTo(0.99);
  });

  it('rewards: staking and lending are capital (box 0027), airdrops a general gain, forks and mining apart', () => {
    const r = buildLedger(
      [
        op({
          kind: 'reward',
          reward: 'staking',
          date: '2025-06-01',
          asset: 'ETH',
          units: 0.1,
          amount: 300,
        }),
        op({
          kind: 'reward',
          reward: 'lending',
          date: '2025-06-02',
          asset: 'USDC',
          units: 10,
          amount: 9,
        }),
        op({
          kind: 'reward',
          reward: 'airdrop',
          date: '2025-07-01',
          asset: 'ABC',
          units: 100,
          amount: 50,
        }),
        op({ kind: 'reward', date: '2025-07-02', asset: 'XYZ', units: 1, amount: 5 }),
        op({
          kind: 'reward',
          reward: 'fork',
          date: '2025-07-03',
          asset: 'BCH',
          units: 1,
          amount: 400,
        }),
        op({
          kind: 'reward',
          reward: 'mining',
          date: '2025-07-04',
          asset: 'BTC',
          units: 0.01,
          amount: 600,
        }),
        op({
          kind: 'reward',
          reward: 'staking',
          date: '2024-06-01',
          asset: 'ETH',
          units: 0.1,
          amount: 200,
        }),
        op({ kind: 'sell', date: '2025-08-01', asset: 'BCH', units: 1, amount: 450 }),
      ],
      { year: 2025, rates: {} }
    );
    expect(r.imported.capital.interest).toBe(309);
    expect(r.imported.generalGains).toEqual([50, 5]);
    expect(r.income.map((i) => [i.asset, i.box, i.base])).toEqual([
      ['ETH', '0027', 'savings'],
      ['USDC', '0027', 'savings'],
      ['ABC', '0304', 'general'],
      ['XYZ', '0304', 'general'],
      ['BTC', '—', 'activity'],
    ]);
    // The forked coins cost nothing: all of the sale is a gain.
    expect(r.sales.find((s) => s.name === 'BCH')?.gain).toBe(450);
    expect(codes(r)).toEqual(expect.arrayContaining(['fork', 'mining', 'earlierYears']));
    expect(r.years[2024]).toEqual({ savings: 200, general: 0 });
  });

  it('as a business, the rewards and derivatives go to the activity', () => {
    const r = buildLedger(
      [
        op({ kind: 'reward', reward: 'staking', date: '2025-06-01', asset: 'ETH', amount: 300 }),
        op({ kind: 'reward', reward: 'airdrop', date: '2025-06-02', asset: 'ABC', amount: 30 }),
        op({
          kind: 'realized',
          date: '2025-06-03',
          asset: 'X',
          assetClass: 'derivative',
          amount: 100,
          cost: 0,
        }),
      ],
      { year: 2025, rates: {}, professional: true }
    );
    expect(r.imported.capital.interest).toBe(0);
    expect(r.imported.generalGains).toEqual([]);
    expect(r.imported.otherGains).toEqual([]);
    expect(r.income.every((i) => i.base === 'activity')).toBe(true);
  });
});

describe('what has to be checked', () => {
  it('sales without purchases, prices and rates that are missing, stablecoins', () => {
    const r = buildLedger(
      [
        op({ kind: 'sell', date: '2025-02-01', asset: 'SOL', units: 2, amount: 300 }),
        op({
          kind: 'swap',
          date: '2025-02-02',
          asset: 'SOL',
          units: 1,
          toAsset: 'JUP',
          toUnits: 10,
        }),
        op({
          kind: 'buy',
          date: '2025-02-03',
          asset: 'ADA',
          units: 10,
          amount: 10,
          currency: 'GBP',
          fee: 1,
          feeCurrency: 'GBP',
        }),
        op({ kind: 'swap', date: '2025-02-06', asset: 'SOL', units: 1, toAsset: 'JUP2' }),
        op({
          kind: 'swap',
          date: '2025-02-07',
          asset: 'SOL',
          units: 1,
          toAsset: 'JUP',
          toUnits: 1,
          toEur: 20,
        }),
        op({
          kind: 'buy',
          date: '2025-02-04',
          asset: 'DOT',
          units: 10,
          amount: 54,
          currency: 'USDT',
          fee: 1,
          feeCurrency: 'USDT',
        }),
        op({
          kind: 'buy',
          date: '2025-02-05',
          asset: 'LINK',
          units: 1,
          amount: 10,
          currency: 'BTC',
        }),
        op({ kind: 'swap', date: '2025-02-08', asset: 'SOL', units: 1, toAsset: 'USDT' }),
        op({
          kind: 'swap',
          date: '2025-02-09',
          asset: 'USDC',
          units: 125,
          toAsset: 'ETH',
          toUnits: 0.05,
        }),
        op({
          kind: 'swap',
          date: '2025-02-10',
          asset: 'ETH',
          units: 0.05,
          toAsset: 'USDT',
          toUnits: 150,
        }),
      ],
      { year: 2025, rates }
    );
    expect(codes(r)).toEqual(
      expect.arrayContaining(['missingPurchase', 'missingPrice', 'missingRate', 'stablecoinPrice'])
    );
    // 54 USDT at 1.25 dollars per euro = 43.20 €, plus the fee of 1 USDT = 0.80 €.
    expect(r.ops.find((o) => o.asset === 'DOT')).toMatchObject({ value: 43.2, feeEur: 0.8 });
    // A swap from 125 USDC is worth 100 €; one to 150 USDT, 120 €.
    expect(r.ops.find((o) => o.asset === 'USDC')?.value).toBe(100);
    expect(r.ops.find((o) => o.toAsset === 'USDT' && o.toUnits === 150)?.toEur).toBe(120);
  });

  it('takes a missing price from another row of the same coin and day (or within three days)', () => {
    const warnings: never[] = [];
    const valued = inferPrices(
      [
        {
          ...op({ kind: 'buy', date: '2025-03-01', asset: 'ETH', units: 2 }),
          value: 6000,
          feeEur: 0,
        },
        {
          ...op({ kind: 'buy', date: '2025-03-02', asset: 'ETH', units: 2 }),
          value: 6200,
          feeEur: 0,
        },
        {
          ...op({ kind: 'reward', date: '2025-03-03', asset: 'ETH', units: 0.1 }),
          value: null,
          feeEur: 0,
        },
        {
          ...op({
            kind: 'swap',
            date: '2025-03-01',
            asset: 'XYZ',
            units: 5,
            toAsset: 'ETH',
            toUnits: 1,
          }),
          value: null,
          feeEur: 0,
        },
        {
          ...op({ kind: 'reward', date: '2025-04-01', asset: 'ETH', units: 1 }),
          value: null,
          feeEur: 0,
        },
        {
          ...op({ kind: 'dividend', date: '2025-04-01', asset: 'ETH', units: 0 }),
          value: null,
          feeEur: 0,
        },
        {
          ...op({ kind: 'transferIn', date: '2025-03-01', asset: 'EUR', assetClass: 'fiat' }),
          value: 5,
          feeEur: 0,
        },
        { ...op({ kind: 'buy', date: '2025-03-01', asset: 'SOL', units: 0 }), value: 5, feeEur: 0 },
        {
          ...op({ kind: 'swap', date: '2025-03-01', asset: 'ABC', units: 1, toAsset: 'DEF' }),
          value: 10,
          toEur: 12,
          feeEur: 0,
        },
        {
          ...op({ kind: 'swap', date: '2025-03-01', asset: 'QQQ', units: 1, toAsset: 'ETH' }),
          value: null,
          feeEur: 0,
        },
      ],
      warnings
    );
    expect(valued.map((v) => v.value)).toEqual([6000, 6200, 310, 3000, null, null, 5, 5, 10, 0]);
    expect(warnings).toHaveLength(3);
  });

  it('pairs transfers between own wallets and warns about the ones without their other half', () => {
    const r = buildLedger(
      [
        op({ kind: 'buy', date: '2025-01-01', asset: 'BTC', units: 1, amount: 30000 }),
        op({
          kind: 'transferOut',
          date: '2025-01-05',
          asset: 'BTC',
          units: 0.5,
          fee: 0.0005,
          feeCurrency: 'BTC',
        }),
        op({
          kind: 'transferIn',
          date: '2025-01-06',
          asset: 'BTC',
          account: 'Ledger Live',
          units: 0.4995,
        }),
        op({ kind: 'transferOut', date: '2025-02-05', asset: 'BTC', units: 0.1 }),
        op({ kind: 'transferIn', date: '2025-03-05', asset: 'ETH', units: 1 }),
        op({
          kind: 'transferOut',
          date: '2025-03-06',
          asset: 'EUR',
          assetClass: 'fiat',
          units: 100,
        }),
        op({ kind: 'fee', date: '2025-03-07', asset: 'BTC', units: 0.0001 }),
      ],
      { year: 2025, rates: {} }
    );
    expect(codes(r)).toEqual(
      expect.arrayContaining(['feeInCoins', 'unmatchedTransfer', 'transferWithoutOrigin'])
    );
    expect(r.warnings.filter((w) => w.code === 'unmatchedTransfer')).toHaveLength(1);
    expect(r.holdings.find((h) => h.account === 'Ledger Live')?.units).toBe(0.4995);
    expect(r.imported.assets[0].sells.at(-1)).toMatchObject({ units: 0.0001, untaxed: true });
  });

  it('turns two on-chain transfers of one transaction into a swap (DeFi)', () => {
    const swapped = swapsOnChain([
      op({ kind: 'transferOut', date: '2025-01-06', asset: 'ETH', units: 0.5, tx: '0x2' }),
      op({ kind: 'transferIn', date: '2025-01-06', asset: 'USDC', units: 1650, tx: '0x2' }),
      op({ kind: 'fee', date: '2025-01-06', asset: 'ETH', units: 0.001, tx: '0x2' }),
      op({ kind: 'transferIn', date: '2025-01-07', asset: 'ETH', units: 1, tx: '0x9' }),
      op({ kind: 'buy', date: '2025-01-08', asset: 'ETH', units: 1 }),
    ]);
    expect(swapped.map((o) => [o.kind, o.asset, o.toAsset])).toEqual([
      ['buy', 'ETH', undefined],
      ['swap', 'ETH', 'USDC'],
      ['fee', 'ETH', undefined],
      ['transferIn', 'ETH', undefined],
    ]);
    const r = buildLedger(
      [
        op({
          kind: 'swap',
          date: '2025-01-06',
          asset: 'ETH',
          units: 1,
          amount: 10,
          toAsset: 'LP',
          toUnits: 1,
          note: 'DeFi: Add Liquidity',
        }),
      ],
      { year: 2025, rates: {} }
    );
    expect(codes(r)).toContain('defi');
  });

  it('crypto lost and bought again near the sale: only a warning (no rule for crypto)', () => {
    const r = buildLedger(
      [
        op({ kind: 'buy', date: '2025-01-10', asset: 'BTC', amount: 1000 }),
        op({ kind: 'sell', date: '2025-02-15', asset: 'BTC', amount: 500 }),
        op({ kind: 'buy', date: '2025-02-20', asset: 'BTC', amount: 600 }),
        op({ kind: 'split', date: '2025-03-01', asset: 'BTC' }),
        op({ kind: 'ignore', date: '2025-03-02', asset: 'BTC' }),
      ],
      { year: 2025, rates: {} }
    );
    expect(r.sales[0]).toMatchObject({ gain: -500, deferred: 0 });
    expect(codes(r)).toEqual(expect.arrayContaining(['repurchase', 'split']));
  });

  it('warns about the models 721 and 720 above 50,000 € abroad (not for own wallets or Spain)', () => {
    const r = buildLedger(
      [
        op({ kind: 'buy', date: '2025-01-10', asset: 'BTC', units: 1, amount: 60000 }),
        op({
          kind: 'buy',
          date: '2025-01-10',
          asset: 'ETH',
          account: 'Ledger Live',
          units: 30,
          amount: 90000,
        }),
        op({
          kind: 'buy',
          date: '2025-01-10',
          asset: 'B2M',
          account: 'Bit2Me',
          units: 1,
          amount: 90000,
        }),
        op({
          kind: 'buy',
          date: '2025-01-11',
          asset: 'US0000000001',
          account: 'Degiro',
          assetClass: 'shares',
          units: 300,
          amount: 55000,
        }),
        op({ kind: 'transferIn', date: '2025-01-12', asset: 'DOGE', units: 10 }),
        op({ kind: 'buy', date: '2025-01-13', asset: 'ZERO', units: 0, amount: 0 }),
      ],
      { year: 2025, rates: {} }
    );
    expect(r.warnings.find((w) => w.code === 'model721')?.amount).toBe(60000);
    expect(r.warnings.find((w) => w.code === 'model720')?.amount).toBe(55000);
    expect(r.holdings.find((h) => h.asset === 'DOGE')?.value).toBeNull();
  });
});

describe('securities and funds', () => {
  it('dividends with tax abroad (box 0588) and with Spanish withholding (box 0597), custody fees', () => {
    const r = buildLedger(
      [
        op({
          kind: 'dividend',
          date: '2025-02-05',
          asset: 'US1',
          assetClass: 'shares',
          units: 0,
          amount: 100,
          currency: 'USD',
        }),
        op({
          kind: 'dividend',
          date: '2025-02-05',
          asset: 'US1',
          assetClass: 'shares',
          units: 0,
          amount: 0,
          currency: 'USD',
          withholding: 15,
        }),
        op({
          kind: 'dividend',
          date: '2025-03-05',
          format: 'es-funds',
          asset: 'ES1',
          assetClass: 'fund',
          units: 0,
          amount: 10,
          withholding: 1.9,
        }),
        op({
          kind: 'interest',
          date: '2025-03-06',
          asset: 'CASH',
          assetClass: 'fiat',
          units: 0,
          amount: 4,
          withholding: 0.76,
          withheldIn: 'spain',
        }),
        op({
          kind: 'dividend',
          date: '2025-03-07',
          asset: 'US2',
          assetClass: 'shares',
          units: 0,
          amount: 8,
        }),
        op({
          kind: 'custody',
          date: '2025-04-01',
          asset: 'US1',
          assetClass: 'shares',
          units: 0,
          amount: 12,
        }),
        op({
          kind: 'custody',
          date: '2024-04-01',
          asset: 'US1',
          assetClass: 'shares',
          units: 0,
          amount: 12,
        }),
        op({
          kind: 'dividend',
          date: '2024-02-05',
          asset: 'US1',
          assetClass: 'shares',
          units: 0,
          amount: 100,
          currency: 'USD',
        }),
        op({
          kind: 'dividend',
          date: '2025-05-05',
          asset: 'GB1',
          assetClass: 'shares',
          units: 0,
          amount: 0,
          currency: 'GBP',
          withholding: 3,
        }),
      ],
      { year: 2025, rates, withheldIn: { 'es-funds': 'spain' } }
    );
    // 100 USD at 1.25 = 80 €; 15 USD = 12 €.
    expect(r.imported.capital).toMatchObject({ dividends: 98, interest: 4, expenses: 12 });
    expect(r.imported.foreignTax).toEqual([{ income: 80, tax: 12 }]);
    expect(r.imported.withheld).toEqual({ capital: 2.66, gains: 0 });
    expect(r.income.find((i) => i.what === 'custody')?.box).toBe('0037');
  });

  it('a transfer between funds keeps the cost and dates (art. 94.1.a); the repayment withholds 19 %', () => {
    const r = buildLedger(
      [
        op({
          kind: 'buy',
          date: '2022-01-05',
          asset: 'ES10',
          assetClass: 'fund',
          units: 100,
          amount: 1000,
        }),
        op({
          kind: 'switchOut',
          date: '2025-03-05',
          asset: 'ES10',
          assetClass: 'fund',
          units: 50,
          amount: 600,
        }),
        op({
          kind: 'switchIn',
          date: '2025-03-06',
          asset: 'ES11',
          assetClass: 'fund',
          units: 60,
          amount: 600,
        }),
        op({
          kind: 'sell',
          date: '2025-09-01',
          asset: 'ES11',
          assetClass: 'fund',
          units: 60,
          amount: 700,
          withholding: 38,
        }),
      ],
      { year: 2025, rates: {} }
    );
    // The 60 new units cost what the 50 old ones did: 500 €, bought on 05-01-2022; gain 200.
    expect(r.sales).toHaveLength(1);
    expect(r.sales[0]).toMatchObject({ section: 'iic', cost: 500, gain: 200 });
    expect(r.sales[0].lots).toEqual([{ date: '2022-01-05', units: 60, cost: 500 }]);
    expect(r.imported.withheld.gains).toBe(38);
  });

  it('transfers without their other half: the tax cost of the entity, or a warning', () => {
    const r = buildLedger(
      [
        op({
          kind: 'switchIn',
          date: '2025-03-06',
          asset: 'ES11',
          assetClass: 'fund',
          units: 60,
          amount: 600,
          cost: 450,
          acquired: '2019-05-05',
        }),
        op({
          kind: 'switchIn',
          date: '2025-03-07',
          asset: 'ES12',
          assetClass: 'fund',
          units: 10,
          amount: 100,
        }),
        op({ kind: 'switchOut', date: '2025-06-01', asset: 'ES13', assetClass: 'fund', units: 10 }),
        op({ kind: 'switchOut', date: '2025-06-02', asset: 'IE1', assetClass: 'etf', units: 1 }),
        op({
          kind: 'sell',
          date: '2025-09-01',
          asset: 'ES11',
          assetClass: 'fund',
          units: 60,
          amount: 700,
        }),
      ],
      { year: 2025, rates: {} }
    );
    expect(r.sales[0].lots).toEqual([{ date: '2019-05-05', units: 60, cost: 450 }]);
    expect(codes(r)).toEqual(
      expect.arrayContaining(['switchInCost', 'switchWithoutPair', 'switchEtf', 'missingPurchase'])
    );
  });

  it('a transfer from a fund without purchases, or a tax cost without its date', () => {
    const r = buildLedger(
      [
        op({ kind: 'switchOut', date: '2025-06-01', asset: 'ES13', assetClass: 'fund', units: 10 }),
        op({ kind: 'switchIn', date: '2025-06-03', asset: 'ES14', assetClass: 'fund', units: 10 }),
        op({
          kind: 'switchIn',
          date: '2025-08-03',
          asset: 'ES15',
          assetClass: 'fund',
          units: 5,
          cost: 70,
        }),
        op({
          kind: 'sell',
          date: '2025-09-03',
          asset: 'ES15',
          assetClass: 'fund',
          units: 5,
          amount: 100,
        }),
      ],
      { year: 2025, rates: {} }
    );
    expect(codes(r)).toContain('missingPurchase');
    expect(r.sales[0].lots).toEqual([{ date: '2025-08-03', units: 5, cost: 70 }]);
  });

  it('a fund sold at a loss and bought again within a year: the loss waits (art. 33.5.g)', () => {
    const r = buildLedger(
      [
        op({
          kind: 'buy',
          date: '2024-01-05',
          asset: 'ES10',
          assetClass: 'fund',
          units: 10,
          amount: 1000,
        }),
        op({
          kind: 'sell',
          date: '2025-03-05',
          asset: 'ES10',
          assetClass: 'fund',
          units: 10,
          amount: 800,
        }),
        op({
          kind: 'buy',
          date: '2025-11-05',
          asset: 'ES10',
          assetClass: 'fund',
          units: 10,
          amount: 790,
        }),
      ],
      { year: 2025, rates: {} }
    );
    expect(r.sales[0]).toMatchObject({ gain: -200, deferred: 200 });
    expect(r.years[2025].savings).toBe(0);
  });

  it('Treasury bills and bonds give capital income (box 0031), not a gain', () => {
    const r = buildLedger(
      [
        op({
          kind: 'buy',
          date: '2025-01-10',
          asset: 'LETRA',
          assetClass: 'bond',
          units: 1,
          amount: 990,
        }),
        op({
          kind: 'sell',
          date: '2025-07-10',
          asset: 'LETRA',
          assetClass: 'bond',
          units: 1,
          amount: 1000,
        }),
        op({
          kind: 'buy',
          date: '2024-01-10',
          asset: 'BONO',
          assetClass: 'bond',
          units: 1,
          amount: 1000,
        }),
        op({
          kind: 'sell',
          date: '2024-07-10',
          asset: 'BONO',
          assetClass: 'bond',
          units: 1,
          amount: 1020,
        }),
      ],
      { year: 2025, rates: {} }
    );
    expect(r.imported.capital.assets).toBe(10);
    expect(r.sales).toEqual([]);
    expect(r.imported.assets).toEqual([]);
  });

  it('closed positions: derivatives as a result of their own, the rest with their purchase', () => {
    const r = buildLedger(
      [
        op({
          kind: 'realized',
          date: '2025-05-05',
          asset: 'SPCX',
          assetClass: 'derivative',
          underlying: 'shares',
          amount: 0,
          cost: 100,
          currency: 'USD',
          account: 'Quantfury',
        }),
        op({
          kind: 'realized',
          date: '2024-05-05',
          asset: 'BTC/USDT',
          assetClass: 'derivative',
          amount: 50,
          cost: 0,
          currency: 'USDT',
          account: 'Quantfury',
        }),
        op({
          kind: 'realized',
          date: '2023-05-05',
          asset: 'ETH/USDT',
          assetClass: 'derivative',
          amount: 0,
          cost: 40,
          currency: 'USDT',
          account: 'Quantfury',
        }),
        op({
          kind: 'realized',
          date: '2025-03-05',
          acquired: '2024-01-05',
          asset: 'AAPL',
          assetClass: 'shares',
          units: 1,
          amount: 220,
          cost: 180,
          currency: 'USD',
        }),
        op({
          kind: 'realized',
          date: '2025-03-06',
          asset: 'X',
          assetClass: 'shares',
          units: 1,
          amount: 10,
        }),
      ],
      { year: 2025, rates }
    );
    // −100 USD at 1.25 = −80 €.
    expect(r.direct).toEqual([
      {
        date: '2025-05-05',
        acquired: '2025-05-05',
        account: 'Quantfury',
        asset: 'SPCX',
        underlying: 'shares',
        proceeds: 0,
        cost: 80,
        gain: -80,
      },
    ]);
    expect(r.imported.otherGains).toEqual([-80]);
    // 220 − 180 dollars at 1.25 = 32 €.
    expect(r.sales[0]).toMatchObject({ name: 'AAPL', section: 'shares', gain: 32 });
    expect(r.years).toEqual({
      2023: { savings: -32, general: 0 },
      2024: { savings: 40, general: 0 },
      2025: { savings: -38, general: 0 },
    });
    expect(codes(r)).toEqual(
      expect.arrayContaining(['derivative', 'realizedMatching', 'earlierYears', 'lossYears'])
    );
  });

  it('ETFs go to their own part of the modelo (2225-2236); gold to "other"; money is never an asset', () => {
    const r = buildLedger(
      [
        op({
          kind: 'buy',
          date: '2025-01-05',
          asset: 'IE1',
          assetClass: 'etf',
          units: 1,
          amount: 100,
        }),
        op({
          kind: 'sell',
          date: '2025-03-05',
          asset: 'IE1',
          assetClass: 'etf',
          units: 1,
          amount: 120,
        }),
        op({
          kind: 'buy',
          date: '2025-01-05',
          asset: 'XAU',
          assetClass: 'commodity',
          units: 1,
          amount: 100,
        }),
        op({
          kind: 'sell',
          date: '2025-03-05',
          asset: 'XAU',
          assetClass: 'commodity',
          units: 1,
          amount: 90,
        }),
        op({
          kind: 'buy',
          date: '2025-01-05',
          asset: 'USD',
          assetClass: 'fiat',
          units: 1,
          amount: 1,
        }),
        op({
          kind: 'sell',
          date: '2025-03-05',
          asset: 'USD',
          assetClass: 'fiat',
          units: 1,
          amount: 1,
        }),
      ],
      { year: 2025, rates: {} }
    );
    expect(r.sales.map((s) => [s.name, s.section, s.gain])).toEqual([
      ['IE1', 'etf', 20],
      ['XAU', 'other', -10],
    ]);
  });
});
