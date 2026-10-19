/**
 * One made-up file per platform (columns from each platform's public help, data invented): the
 * format is recognised and each row becomes the operation it should.
 */
import { parseCSV } from '@modules/finances/domain/importParsers';
import { readTables } from '@modules/tools/domain/invest/detect';
import type { InvestOp } from '@modules/tools/domain/invest/types';

const read = (csv: string, name = 't') => readTables([{ name, rows: parseCSV(csv) }], 'f');
const opsOf = (csv: string) => read(csv).flatMap((r) => r.ops);
const pick = (op: InvestOp) => ({
  kind: op.kind,
  asset: op.asset,
  units: op.units,
  amount: op.amount,
  currency: op.currency,
  ...(op.toAsset ? { toAsset: op.toAsset, toUnits: op.toUnits } : {}),
  ...(op.reward ? { reward: op.reward } : {}),
});

describe('crypto exchanges', () => {
  it('Binance transaction history: legs grouped by moment into trades, fees and rewards', () => {
    const r = read(`"User_ID","UTC_Time","Account","Operation","Coin","Change","Remark"
"1","2025-02-01 10:00:00","Spot","Buy","EUR","-1000",""
"1","2025-02-01 10:00:00","Spot","Buy","BTC","0.05",""
"1","2025-02-01 10:00:00","Spot","Fee","BNB","-0.01",""
"1","2025-02-02 10:00:00","Spot","Transaction Spend","BTC","-0.01",""
"1","2025-02-02 10:00:00","Spot","Transaction Buy","ETH","0.2",""
"1","2025-02-03 10:00:00","Spot","Deposit","BTC","0.1",""
"1","2025-02-03 11:00:00","Spot","Deposit","EUR","500",""
"1","2025-02-04 10:00:00","Earn","Simple Earn Flexible Interest","BTC","0.0001",""
"1","2025-02-05 10:00:00","Earn","Simple Earn Flexible Subscription","BTC","-0.05",""
"1","2025-02-06 10:00:00","Spot","Airdrop Assets","ABC","10",""
"1","2025-02-07 10:00:00","Spot","Withdraw","BTC","-0.02",""
"1","2025-02-08 10:00:00","Spot","Buy Crypto","SOL","3",""
"1","2025-02-09 10:00:00","Spot","Small Assets Exchange BNB","XYZ","-5",""
"1","2025-02-09 10:00:00","Spot","Small Assets Exchange BNB","QRS","-7",""
"1","2025-02-09 10:00:00","Spot","Small Assets Exchange BNB","BNB","0.02",""
"1","2025-02-10 10:00:00","Spot","Fee","ETH","-0.001",""
"1","2025-02-11 10:00:00","Spot","Sell","BTC","-0.01",""`);
    expect(r[0].format?.id).toBe('binance-history');
    const ops = r[0].ops;
    expect(ops.map(pick)).toEqual(
      expect.arrayContaining([
        { kind: 'buy', asset: 'BTC', units: 0.05, amount: 1000, currency: 'EUR' },
        {
          kind: 'swap',
          asset: 'BTC',
          units: 0.01,
          amount: null,
          currency: null,
          toAsset: 'ETH',
          toUnits: 0.2,
        },
        { kind: 'transferIn', asset: 'BTC', units: 0.1, amount: null, currency: null },
        {
          kind: 'reward',
          asset: 'BTC',
          units: 0.0001,
          amount: null,
          currency: null,
          reward: 'lending',
        },
        {
          kind: 'reward',
          asset: 'ABC',
          units: 10,
          amount: null,
          currency: null,
          reward: 'airdrop',
        },
        { kind: 'transferOut', asset: 'BTC', units: 0.02, amount: null, currency: null },
        { kind: 'buy', asset: 'SOL', units: 3, amount: null, currency: null },
        {
          kind: 'swap',
          asset: 'XYZ',
          units: 5,
          amount: null,
          currency: null,
          toAsset: 'BNB',
          toUnits: 0.01,
        },
        { kind: 'fee', asset: 'ETH', units: 0.001, amount: null, currency: null },
        { kind: 'sell', asset: 'BTC', units: 0.01, amount: null, currency: null },
      ])
    );
    expect(ops.find((o) => o.kind === 'buy' && o.asset === 'BTC')).toMatchObject({
      fee: 0.01,
      feeCurrency: 'BNB',
    });
    // The EUR deposit is money, not an asset.
    expect(ops.some((o) => o.asset === 'EUR')).toBe(false);
  });

  it('Binance spot trade history: "0.5BTC" and "15000USDT" cells', () => {
    const ops = opsOf(`Date(UTC),Pair,Side,Price,Executed,Amount,Fee
2025-03-01 10:00:00,BTCEUR,BUY,30000,0.1BTC,3000EUR,0.0001BTC
2025-03-02 10:00:00,ETHBTC,SELL,0.05,1ETH,0.05BTC,0.00005BTC
2025-03-03 10:00:00,BTCUSDT,BUY,60000,0.01BTC,600USDT,0.6USDT
2025-03-04 10:00:00,BTCEUR,SELL,30000,0.1,3000,0.3EUR`);
    expect(ops.map(pick)).toEqual([
      { kind: 'buy', asset: 'BTC', units: 0.1, amount: 3000, currency: 'EUR' },
      {
        kind: 'swap',
        asset: 'ETH',
        units: 1,
        amount: null,
        currency: null,
        toAsset: 'BTC',
        toUnits: 0.05,
      },
      {
        kind: 'swap',
        asset: 'USDT',
        units: 600,
        amount: null,
        currency: null,
        toAsset: 'BTC',
        toUnits: 0.01,
      },
      { kind: 'sell', asset: 'BTC', units: 0.1, amount: 3000, currency: 'EUR' },
    ]);
    expect(ops[0]).toMatchObject({ fee: 0.0001, feeCurrency: 'BTC' });
  });

  it('Coinbase: purchases, rewards, sends and converts from the notes', () => {
    const r = read(`Transactions
User,ficticio@example.com,abc
Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes
2025-01-05T10:00:00Z,Buy,BTC,0.01,EUR,€40000.00,€400.00,€405.00,€5.00,Bought 0.01 BTC
2025-01-06T10:00:00Z,Staking Income,ETH,0.001,EUR,€3000.00,€3.00,€3.00,€0.00,
2025-01-07T10:00:00Z,Convert,BTC,0.005,EUR,€41000.00,€205.00,€205.00,€1.00,Converted 0.005 BTC to 0.06 ETH
2025-01-08T10:00:00Z,Send,BTC,0.001,EUR,€41000.00,€41.00,€41.00,€0.00,To 0xabc
2025-01-09T10:00:00Z,Retail Staking Transfer,ETH,0.06,EUR,€3000.00,€180.00,€180.00,€0.00,
2025-01-10T10:00:00Z,Something New,ETH,1,EUR,€3000.00,€3000.00,€3000.00,€0.00,
2025-01-11T10:00:00Z,Convert,BTC,0.001,EUR,€41000.00,€41.00,€41.00,€0.00,`);
    expect(r[0].format?.id).toBe('coinbase');
    expect(r[0].skipped).toBe(1);
    expect(r[0].ops.map(pick)).toEqual([
      { kind: 'buy', asset: 'BTC', units: 0.01, amount: 400, currency: 'EUR' },
      { kind: 'reward', asset: 'ETH', units: 0.001, amount: 3, currency: 'EUR', reward: 'staking' },
      {
        kind: 'swap',
        asset: 'BTC',
        units: 0.005,
        amount: 205,
        currency: 'EUR',
        toAsset: 'ETH',
        toUnits: 0.06,
      },
      { kind: 'transferOut', asset: 'BTC', units: 0.001, amount: 41, currency: 'EUR' },
      { kind: 'ignore', asset: 'ETH', units: 0.06, amount: 180, currency: 'EUR' },
      { kind: 'swap', asset: 'BTC', units: 0.001, amount: 41, currency: 'EUR' },
    ]);
    expect(r[0].ops[0].fee).toBe(5);
  });

  it('Coinbase Pro fills', () => {
    const ops =
      opsOf(`portfolio,trade id,product,side,created at,size,size unit,price,fee,total,price/fee/total unit
default,1,BTC-EUR,BUY,2025-01-05T10:00:00.000Z,0.01,BTC,40000,2,-402,EUR
default,2,BTC-EUR,SELL,2025-02-05T10:00:00.000Z,0.01,BTC,45000,2,448,EUR`);
    expect(ops.map(pick)).toEqual([
      { kind: 'buy', asset: 'BTC', units: 0.01, amount: 400, currency: 'EUR' },
      { kind: 'sell', asset: 'BTC', units: 0.01, amount: 450, currency: 'EUR' },
    ]);
    expect(ops[0]).toMatchObject({ fee: 2, feeCurrency: 'EUR' });
  });

  it('Kraken ledgers: legs by refid, staking, transfers and ignored subtypes', () => {
    const ops =
      opsOf(`"txid","refid","time","type","subtype","aclass","asset","amount","fee","balance"
"L1","R1","2025-01-05 10:00:00","trade","","currency","ZEUR","-500.0000","1.0000","100"
"L2","R1","2025-01-05 10:00:00","trade","","currency","XXBT","0.0125000000","0","0.0125"
"L3","R2","2025-01-06 10:00:00","staking","","currency","DOT.S","0.5","0","0.5"
"L4","R3","2025-01-07 10:00:00","transfer","spottostaking","currency","DOT","-10","0","0"
"L5","R4","2025-01-08 10:00:00","withdrawal","","currency","XXBT","-0.005","0.0001","0.0075"
"L6","R5","2025-01-09 10:00:00","deposit","","currency","ZEUR","1000","0","1000"
"L7","R6","2025-01-10 10:00:00","earn","allocation","currency","ETH","1","0","1"
"L8","R7","2025-01-11 10:00:00","trade","","currency","XETH","","0","1"`);
    expect(ops.map(pick)).toEqual(
      expect.arrayContaining([
        { kind: 'buy', asset: 'BTC', units: 0.0125, amount: 500, currency: 'EUR' },
        {
          kind: 'reward',
          asset: 'DOT',
          units: 0.5,
          amount: null,
          currency: null,
          reward: 'staking',
        },
        { kind: 'transferOut', asset: 'BTC', units: 0.005, amount: null, currency: null },
      ])
    );
    expect(ops).toHaveLength(3);
  });

  it('Kraken trades: against money and against another coin', () => {
    const ops =
      opsOf(`"txid","ordertxid","pair","time","type","ordertype","price","cost","fee","vol","margin","misc","ledgers"
"T1","O1","XXBTZEUR","2025-01-05 10:00:00","buy","limit","40000","400","1","0.01","0","",""
"T2","O2","XETHXXBT","2025-01-06 10:00:00","sell","limit","0.05","0.05","0.0001","1","0","",""
"T3","O3","XETHXXBT","2025-01-07 10:00:00","buy","limit","0.05","0.05","0.0001","1","0","",""`);
    expect(ops.map(pick)).toEqual([
      { kind: 'buy', asset: 'BTC', units: 0.01, amount: 400, currency: 'EUR' },
      {
        kind: 'swap',
        asset: 'ETH',
        units: 1,
        amount: null,
        currency: null,
        toAsset: 'BTC',
        toUnits: 0.05,
      },
      {
        kind: 'swap',
        asset: 'BTC',
        units: 0.05,
        amount: null,
        currency: null,
        toAsset: 'ETH',
        toUnits: 1,
      },
    ]);
  });

  it('Bitpanda: buys, sells, rewards, transfers, stocks and metals; money rows left out', () => {
    const r = read(`Disclaimer: data
Transaction ID,Timestamp,Transaction Type,In/Out,Amount Fiat,Fiat,Amount Asset,Asset,Asset market price,Asset market price currency,Asset class,Product ID,Fee,Fee asset,Spread,Spread Currency,Tax Fiat
T1,2025-01-05T10:00:00+01:00,deposit,incoming,1000,EUR,-,EUR,-,-,Fiat,,0,EUR,,,0
T2,2025-01-06T10:00:00+01:00,buy,outgoing,500,EUR,0.0125,BTC,40000,EUR,Cryptocurrency,1,0,BEST,,,0
T3,2025-01-07T10:00:00+01:00,sell,incoming,210,EUR,0.005,BTC,42000,EUR,Cryptocurrency,1,0,BEST,,,0
T4,2025-01-08T10:00:00+01:00,transfer,incoming,3,EUR,0.001,ETH,3000,EUR,Cryptocurrency,2,0,ETH,,,0
T5,2025-01-08T11:00:00+01:00,reward,incoming,1,EUR,0.0003,ETH,3000,EUR,Cryptocurrency,2,0,ETH,,,0
T6,2025-01-09T10:00:00+01:00,withdrawal,outgoing,30,EUR,0.01,ETH,3000,EUR,Cryptocurrency,2,0,ETH,,,0
T7,2025-01-10T10:00:00+01:00,buy,outgoing,100,EUR,1,AAPL,100,EUR,Stock (derivative),3,0,EUR,,,0
T8,2025-01-11T10:00:00+01:00,buy,outgoing,60,EUR,1,GOLD,60,EUR,Metal,4,0,EUR,,,0
T9,2025-01-12T10:00:00+01:00,buy,outgoing,50,EUR,1,VWCE,50,EUR,ETF,5,0,EUR,,,0
T10,2025-01-13T10:00:00+01:00,buy,outgoing,50,EUR,1,SAN,50,EUR,Stock,6,0,EUR,,,0`);
    const ops = r[0].ops;
    expect(ops.map((o) => [o.kind, o.asset, o.assetClass])).toEqual([
      ['buy', 'BTC', 'crypto'],
      ['sell', 'BTC', 'crypto'],
      ['transferIn', 'ETH', 'crypto'],
      ['reward', 'ETH', 'crypto'],
      ['transferOut', 'ETH', 'crypto'],
      ['buy', 'AAPL', 'derivative'],
      ['buy', 'GOLD', 'commodity'],
      ['buy', 'VWCE', 'etf'],
      ['buy', 'SAN', 'shares'],
    ]);
    expect(ops[0]).toMatchObject({ amount: 500, currency: 'EUR', units: 0.0125 });
  });

  it('Crypto.com App: purchases, swaps, sales, rewards and their reversals', () => {
    const ops =
      opsOf(`Timestamp (UTC),Transaction Description,Currency,Amount,To Currency,To Amount,Native Currency,Native Amount,Native Amount (in USD),Transaction Kind,Transaction Hash
2025-01-05 10:00:00,Buy BTC,BTC,0.01,,,EUR,400,430,crypto_purchase,
2025-01-06 10:00:00,EUR -> BTC,EUR,-200,BTC,0.005,EUR,200,215,viban_purchase,
2025-01-07 10:00:00,BTC -> ETH,BTC,-0.002,ETH,0.03,EUR,85,90,crypto_exchange,
2025-01-08 10:00:00,BTC -> EUR,BTC,-0.003,EUR,130,EUR,130,140,crypto_viban_exchange,
2025-01-09 10:00:00,Card Cashback,CRO,5,,,EUR,0.5,0.55,referral_card_cashback,
2025-01-10 10:00:00,Card Cashback Reversal,CRO,-1,,,EUR,0.1,0.11,card_cashback_reverted,
2025-01-11 10:00:00,Crypto Earn,BTC,0.0001,,,EUR,4,4.3,crypto_earn_interest_paid,
2025-01-12 10:00:00,Withdraw BTC,BTC,-0.001,,,EUR,42,45,crypto_withdrawal,
2025-01-13 10:00:00,Lockup,CRO,-100,,,EUR,10,11,lockup_lock,
2025-01-14 10:00:00,Unknown,CRO,1,,,EUR,0.1,0.11,mystery_kind,`);
    expect(ops.map(pick)).toEqual([
      { kind: 'buy', asset: 'BTC', units: 0.01, amount: 400, currency: 'EUR' },
      { kind: 'buy', asset: 'BTC', units: 0.005, amount: 200, currency: 'EUR' },
      {
        kind: 'swap',
        asset: 'BTC',
        units: 0.002,
        amount: 85,
        currency: 'EUR',
        toAsset: 'ETH',
        toUnits: 0.03,
      },
      { kind: 'sell', asset: 'BTC', units: 0.003, amount: 130, currency: 'EUR' },
      { kind: 'reward', asset: 'CRO', units: 5, amount: 0.5, currency: 'EUR', reward: 'cashback' },
      { kind: 'fee', asset: 'CRO', units: 1, amount: 0.1, currency: 'EUR', reward: 'cashback' },
      {
        kind: 'reward',
        asset: 'BTC',
        units: 0.0001,
        amount: 4,
        currency: 'EUR',
        reward: 'lending',
      },
      { kind: 'transferOut', asset: 'BTC', units: 0.001, amount: 42, currency: 'EUR' },
    ]);
  });

  it('Nexo: interest, exchanges and card purchases, in dollars', () => {
    const ops =
      opsOf(`Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Details,Date / Time (UTC)
N1,Interest,NEXO,0.5,NEXO,0.5,$0.60,approved / Interest,2025-01-05 10:00:00
N2,Exchange,BTC,-0.01,ETH,0.15,$430.00,approved / Exchange,2025-01-06 10:00:00
N3,Top up Crypto,EURX,-100,BTC,0.0025,$108.00,approved,2025-01-07 10:00:00
N4,Locking Term Deposit,BTC,-0.01,BTC,0.01,$430.00,approved,2025-01-08 10:00:00
N5,Withdrawal,BTC,-0.001,BTC,-0.001,$43.00,approved,2025-01-09 10:00:00`);
    expect(ops.map(pick)).toEqual([
      {
        kind: 'reward',
        asset: 'NEXO',
        units: 0.5,
        amount: 0.6,
        currency: 'USD',
        reward: 'lending',
      },
      {
        kind: 'swap',
        asset: 'BTC',
        units: 0.01,
        amount: 430,
        currency: 'USD',
        toAsset: 'ETH',
        toUnits: 0.15,
      },
      { kind: 'buy', asset: 'BTC', units: 0.0025, amount: 108, currency: 'USD' },
      { kind: 'transferOut', asset: 'BTC', units: 0.001, amount: 43, currency: 'USD' },
    ]);
  });

  it('Bit2Me: from/to rows in Spanish', () => {
    const ops =
      opsOf(`Fecha;Tipo;Moneda origen;Cantidad origen;Moneda destino;Cantidad destino;Comisión;Moneda comisión
05/01/2025 10:00;Compra;EUR;500;BTC;0,0125;2,5;EUR
06/01/2025 10:00;Venta;BTC;0,005;EUR;210;1;EUR
07/01/2025 10:00;Intercambio;BTC;0,002;ETH;0,03;0;
08/01/2025 10:00;Earn;B2M;10;;;0;
09/01/2025 10:00;Depósito;ETH;1;;;0;
10/01/2025 10:00;Retirada;ETH;0,5;;;0;`);
    expect(ops.map(pick)).toEqual([
      { kind: 'buy', asset: 'BTC', units: 0.0125, amount: 500, currency: 'EUR' },
      { kind: 'sell', asset: 'BTC', units: 0.005, amount: 210, currency: 'EUR' },
      {
        kind: 'swap',
        asset: 'BTC',
        units: 0.002,
        amount: null,
        currency: null,
        toAsset: 'ETH',
        toUnits: 0.03,
      },
      { kind: 'reward', asset: 'B2M', units: 10, amount: null, currency: null, reward: 'staking' },
      { kind: 'transferIn', asset: 'ETH', units: 1, amount: null, currency: null },
      { kind: 'transferOut', asset: 'ETH', units: 0.5, amount: null, currency: null },
    ]);
    expect(ops[0].fee).toBe(2.5);
  });

  it('KuCoin (both exports), Bybit and OKX: pairs against money and against coins', () => {
    const kucoin =
      opsOf(`UID,Account Type,Order ID,Order Time(UTC),Symbol,Side,Order Type,Avg. Filled Price,Filled Amount,Filled Volume,Filled Volume (USDT),Filled Time(UTC),Fee,Fee Currency,Tax,Status
1,mainAccount,O1,2025-01-05 10:00:00,BTC-EUR,BUY,LIMIT,40000,0.01,400,430,2025-01-05 10:00:01,0.4,EUR,,deal
1,mainAccount,O2,2025-01-06 10:00:00,ETH-BTC,BUY,LIMIT,0.05,1,0.05,3000,2025-01-06 10:00:01,0.00005,BTC,,deal
1,mainAccount,O3,2025-01-07 10:00:00,WEIRD,BUY,LIMIT,1,1,1,1,2025-01-07 10:00:01,0,EUR,,deal`);
    expect(kucoin.map(pick)).toEqual([
      { kind: 'buy', asset: 'BTC', units: 0.01, amount: 400, currency: 'EUR' },
      {
        kind: 'swap',
        asset: 'BTC',
        units: 0.05,
        amount: null,
        currency: null,
        toAsset: 'ETH',
        toUnits: 1,
      },
    ]);
    const old =
      opsOf(`tradeCreatedAt,orderId,symbol,side,price,size,funds,fee,liquidity,feeCurrency,orderType
2021-01-05 10:00:00,O1,BTC-USDT,sell,30000,0.01,300,0.3,taker,USDT,limit`);
    expect(old.map(pick)).toEqual([
      {
        kind: 'swap',
        asset: 'BTC',
        units: 0.01,
        amount: null,
        currency: null,
        toAsset: 'USDT',
        toUnits: 300,
      },
    ]);
    const bybit =
      opsOf(`Spot Pairs,Order Type,Direction,Filled Value,Filled Price,Filled Quantity,Fees,Transaction ID,Order No.,Timestamp (UTC)
BTCEUR,LIMIT,BUY,400,40000,0.01,0.00001,T1,O1,2025-01-05 10:00:00
BTCEUR,LIMIT,SELL,450,45000,0.01,0.45,T2,O2,2025-01-06 10:00:00`);
    expect(bybit[0]).toMatchObject({ kind: 'buy', asset: 'BTC', amount: 400, feeCurrency: 'BTC' });
    expect(bybit[1]).toMatchObject({ kind: 'sell', amount: 450, feeCurrency: 'EUR' });
    const okx =
      opsOf(`id,Order id,Time,Trade Type,Symbol,Action,Amount,Trading Unit,Filled Price,PnL,Fee,Fee Unit
1,O1,2025-01-05 10:00:00,Spot,BTC-EUR,buy,0.01,BTC,40000,0,-0.00001,BTC
2,O2,2025-01-06 10:00:00,Spot,BTC-EUR,sell,0.01,BTC,45000,0,-0.45,EUR`);
    expect(okx.map(pick)).toEqual([
      { kind: 'buy', asset: 'BTC', units: 0.01, amount: 400, currency: 'EUR' },
      { kind: 'sell', asset: 'BTC', units: 0.01, amount: 450, currency: 'EUR' },
    ]);
  });

  it('Bitvavo, Bitstamp (new and old) and Gemini', () => {
    const bitvavo =
      opsOf(`Timezone,Date,Time,Type,Currency,Amount,Quote Currency,Quote Price,Received / Paid Currency,Received / Paid Amount,Fee currency,Fee amount,Status,Transaction ID,Address
Europe/Amsterdam,2025-01-05,10:00:00,buy,BTC,0.01,EUR,40000,EUR,-400,EUR,1,Completed,T1,
Europe/Amsterdam,2025-01-06,10:00:00,staking,ETH,0.001,EUR,3000,EUR,,,,Completed,T2,
Europe/Amsterdam,2025-01-07,10:00:00,withdrawal,BTC,-0.005,,,,,BTC,0.0001,Completed,T3,addr
Europe/Amsterdam,2025-01-08,10:00:00,deposit,EUR,500,,,,,,,Completed,T4,
Europe/Amsterdam,2025-01-09,10:00:00,odd,EUR,500,,,,,,,Completed,T5,`);
    expect(bitvavo.map((o) => [o.kind, o.asset, o.at])).toEqual([
      ['buy', 'BTC', '2025-01-05T10:00:00'],
      ['reward', 'ETH', '2025-01-06T10:00:00'],
      ['transferOut', 'BTC', '2025-01-07T10:00:00'],
    ]);
    const bitstamp =
      opsOf(`ID,Account,Type,Subtype,Datetime,Amount,Amount currency,Value,Value currency,Rate,Rate currency,Fee,Fee currency,Order ID
1,Main,Market,Buy,2025-01-05T10:00:00Z,0.01,BTC,400,EUR,40000,EUR,1,EUR,O1
2,Main,Market,Sell,2025-01-06T10:00:00Z,0.005,BTC,210,EUR,42000,EUR,0.5,EUR,O2
3,Main,Deposit,,2025-01-07T10:00:00Z,500,EUR,,,,,,,
4,Main,Withdrawal,,2025-01-08T10:00:00Z,0.001,BTC,,,,,,,
5,Main,Staking reward,,2025-01-09T10:00:00Z,0.01,ETH,,,,,,,
6,Main,Other,,2025-01-10T10:00:00Z,0.01,ETH,,,,,,,`);
    expect(bitstamp.map((o) => [o.kind, o.asset, o.amount])).toEqual([
      ['buy', 'BTC', 400],
      ['sell', 'BTC', 210],
      ['transferOut', 'BTC', null],
      ['reward', 'ETH', null],
    ]);
    const old = opsOf(`Type,Datetime,Account,Amount,Value,Rate,Fee,Sub Type
Market,2021-01-05 10:00:00,Main Account,0.50000000 BTC,15000.00 EUR,30000.00 EUR,15.00 EUR,Buy`);
    expect(old.map(pick)).toEqual([
      { kind: 'buy', asset: 'BTC', units: 0.5, amount: 15000, currency: 'EUR' },
    ]);
    const gemini =
      opsOf(`Date,Time (UTC),Type,Symbol,Specification,Liquidity Indicator,Trading Fee Rate (bps),USD Amount USD,Trading Fee (USD) USD,BTC Amount BTC,ETH Amount ETH
2025-01-05,10:00:00,Buy,BTCUSD,Buy,Taker,35,-430.00,1.50,0.01,
2025-01-06,10:00:00,Sell,ETHBTC,Sell,Taker,35,,,0.05,-1
2025-01-07,10:00:00,Credit,BTCUSD,Deposit,,,,,0.1,
2025-01-08,10:00:00,Debit,BTCUSD,Withdrawal,,,,,-0.02,
2025-01-09,10:00:00,Interest,BTCUSD,Earn,,,,,0.001,
2025-01-10,10:00:00,Credit,ETHUSD,Deposit,,,,,,`);
    expect(gemini.map(pick)).toEqual([
      { kind: 'buy', asset: 'BTC', units: 0.01, amount: 430, currency: 'USD' },
      {
        kind: 'swap',
        asset: 'ETH',
        units: 1,
        amount: null,
        currency: null,
        toAsset: 'BTC',
        toUnits: 0.05,
      },
      { kind: 'transferIn', asset: 'BTC', units: 0.1, amount: null, currency: 'USD' },
      { kind: 'transferOut', asset: 'BTC', units: 0.02, amount: null, currency: 'USD' },
      { kind: 'transferIn', asset: 'ETH', units: 0, amount: null, currency: 'USD' },
    ]);
  });

  it('Ledger Live: in, out, fees, rewards and delegations', () => {
    const ops =
      opsOf(`Operation Date,Status,Currency Ticker,Operation Type,Operation Amount,Operation Fees,Operation Hash,Account Name,Account xpub,Countervalue Ticker,Countervalue at Operation Date,Countervalue at CSV Export
2025-01-05T10:00:00.000Z,Confirmed,BTC,IN,0.01,0.0001,h1,Bitcoin 1,x,EUR,400,500
2025-01-06T10:00:00.000Z,Confirmed,BTC,OUT,0.005,0.0001,h2,Bitcoin 1,x,EUR,200,250
2025-01-07T10:00:00.000Z,Confirmed,ETH,FEES,0,0.002,h3,Ethereum 1,x,EUR,0,0
2025-01-08T10:00:00.000Z,Confirmed,DOT,REWARD,0.5,0,h4,Polkadot 1,x,EUR,3,3
2025-01-09T10:00:00.000Z,Confirmed,DOT,DELEGATE,0,0.01,h5,Polkadot 1,x,EUR,0,0
2025-01-10T10:00:00.000Z,Confirmed,DOT,UNDELEGATE,0,0,h6,Polkadot 1,x,EUR,0,0
2025-01-11T10:00:00.000Z,Failed,BTC,OUT,0.5,0.0001,h7,Bitcoin 1,x,EUR,0,0`);
    expect(ops.map((o) => [o.kind, o.asset, o.units, o.amount])).toEqual([
      ['transferIn', 'BTC', 0.01, 400],
      ['transferOut', 'BTC', 0.005, 200],
      ['fee', 'ETH', 0.002, 0],
      ['reward', 'DOT', 0.5, 3],
      ['fee', 'DOT', 0.01, 0],
    ]);
    expect(ops[1]).toMatchObject({ fee: 0.0001, feeCurrency: 'BTC' });
  });

  it('Etherscan (MetaMask): ETH movements and token transfers of the own address', () => {
    const eth =
      opsOf(`"Transaction Hash","Blockno","UnixTimestamp","DateTime (UTC)","From","To","ContractAddress","Value_IN(ETH)","Value_OUT(ETH)","CurrentValue @ $3000/Eth","TxnFee(ETH)","TxnFee(USD)","Historical $Price/Eth","Status","ErrCode","Method"
"0x1","1","1736071200","2025-01-05 10:00:00","0xother","0xmine","","1","0","3000","0","0","3300","","","Transfer"
"0x2","2","1736157600","2025-01-06 10:00:00","0xmine","0xrouter","","0","0.5","1500","0.001","3.3","3300","","","Swap Exact ETH For Tokens"
"0x3","3","1736244000","2025-01-07 10:00:00","0xmine","0xrouter","","0","0.1","300","0.001","3.3","","","Out of gas","Swap"
"0x4","4","1736330400","2025-01-08 10:00:00","0xmine","0xpool","","0","0","0","0.002","6.6","","","","Add Liquidity"
"0x7","7","1736589600","2025-01-11 10:00:00","0xother","0xmine","","0.2","0","600","0","0","","","",""`);
    expect(eth.map((o) => [o.kind, o.units, o.amount, o.tx, o.note?.startsWith('DeFi')])).toEqual([
      ['transferIn', 1, 3300, '0x1', false],
      ['transferOut', 0.5, 1650, '0x2', false],
      ['fee', 0.001, 3.3, '0x2', false],
      ['fee', 0.002, null, '0x4', true],
      ['transferIn', 0.2, null, '0x7', undefined],
    ]);
    const tokens =
      opsOf(`"Transaction Hash","Blockno","UnixTimestamp","DateTime (UTC)","From","To","TokenValue","USDValueDayOfTx","ContractAddress","TokenName","TokenSymbol"
"0x2","2","1736157600","2025-01-06 10:00:00","0xrouter","0xmine","1650","$1,650.00","0xc","USD Coin","USDC"
"0x5","5","1736416800","2025-01-09 10:00:00","0xmine","0xfriend","100","$100.00","0xc","USD Coin","USDC"
"0x6","6","1736503200","2025-01-10 10:00:00","0xpool","0xmine","1","$10.00","0xd","Uniswap V2","UNI-V2"
"0x8","8","1736589600","2025-01-11 10:00:00","0xmine","0xfriend","5","$5.00","0xe","","ABC"`);
    expect(
      tokens.map((o) => [o.kind, o.asset, o.units, o.tx, !!o.note?.startsWith('DeFi')])
    ).toEqual([
      ['transferIn', 'USDC', 1650, '0x2', false],
      ['transferOut', 'USDC', 100, '0x5', false],
      ['transferIn', 'UNI-V2', 1, '0x6', true],
      ['transferOut', 'ABC', 5, '0x8', false],
    ]);
    const header = `"Transaction Hash","Blockno","UnixTimestamp","DateTime (UTC)","From","To","TokenValue","USDValueDayOfTx","ContractAddress","TokenName","TokenSymbol"`;
    expect(opsOf(header)).toEqual([]);
  });

  it('Revolut: crypto statement, older statement and commodities', () => {
    const crypto = opsOf(`Symbol,Type,Quantity,Price,Value,Fees,Date
BTC,Buy,0.01,"€40,000.00",€400.00,€6.00,"Jan 5, 2025"
BTC,Buy,0.01,"€40,000.00",€400.00,€6.00,05/01/2025 10:00:00
ETH,Staking reward,0.001,"€3,000.00",€3.00,€0.00,06/01/2025 10:00:00
ETH,Stake,1,"€3,000.00","€3,000.00",€0.00,07/01/2025 10:00:00
BTC,Send,0.002,"€40,000.00",€80.00,€0.00,08/01/2025 10:00:00
BTC,Sell,0.005,"€42,000.00",€210.00,€3.00,09/01/2025 10:00:00
ETH,Odd,1,€1.00,€1.00,€0.00,10/01/2025 10:00:00`);
    expect(crypto.map(pick)).toEqual([
      { kind: 'buy', asset: 'BTC', units: 0.01, amount: 400, currency: 'EUR' },
      { kind: 'reward', asset: 'ETH', units: 0.001, amount: 3, currency: 'EUR', reward: 'staking' },
      { kind: 'ignore', asset: 'ETH', units: 1, amount: 3000, currency: 'EUR' },
      { kind: 'transferOut', asset: 'BTC', units: 0.002, amount: 80, currency: 'EUR' },
      { kind: 'sell', asset: 'BTC', units: 0.005, amount: 210, currency: 'EUR' },
    ]);
    const legacy =
      opsOf(`Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
EXCHANGE,Current,2025-01-05 10:00:00,2025-01-05 10:00:01,Exchanged to BTC,-400.00,0.00,EUR,COMPLETED,100
EXCHANGE,Crypto,2025-01-05 10:00:00,2025-01-05 10:00:01,Exchanged to BTC,0.01,0.00,BTC,COMPLETED,0.01
EXCHANGE,Commodities,2025-01-06 10:00:00,2025-01-06 10:00:01,Exchanged to XAU,-100.00,0.00,EUR,COMPLETED,0
EXCHANGE,Commodities,2025-01-06 10:00:00,2025-01-06 10:00:01,Exchanged to XAU,1.5,0.00,XAU,COMPLETED,1.5
EXCHANGE,Crypto,2025-01-07 10:00:00,2025-01-07 10:00:01,Exchanged to BTC,0.5,0.00,BTC,REVERTED,0
TOPUP,Current,2025-01-08 10:00:00,2025-01-08 10:00:01,Top-up,100,0.00,EUR,COMPLETED,200`);
    expect(legacy.map((o) => [o.kind, o.asset, o.units, o.amount, o.assetClass])).toEqual([
      ['buy', 'BTC', 0.01, 400, 'crypto'],
      ['buy', 'XAU', 1.5, 100, 'commodity'],
    ]);
  });

  it('Revolut stocks, profit and loss (sales and other income) and Savings', () => {
    const stocks = opsOf(`Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate
2025-01-05T10:00:00.000Z,AAPL,BUY - MARKET,2,USD 200,USD 400,USD,1.08
2025-02-05T10:00:00.000Z,AAPL,DIVIDEND,,,USD 1.00,USD,1.08
2025-02-05T10:00:01.000Z,AAPL,DIVIDEND TAX (CORRECTION),,,USD -0.15,USD,1.08
2025-03-05T10:00:00.000Z,AAPL,SELL - MARKET,1,USD 220,USD 220,USD,1.08
2025-03-06T10:00:00.000Z,,CUSTODY FEE,,,USD -1.00,USD,1.08
2025-03-07T10:00:00.000Z,,CASH TOP-UP,,,USD 100,USD,1.08
2025-03-08T10:00:00.000Z,TSLA,STOCK SPLIT,2,,,USD,1.08
2025-03-09T10:00:00.000Z,TSLA,MYSTERY,2,,,USD,1.08`);
    expect(stocks.map((o) => [o.kind, o.asset, o.units, o.amount, o.withholding])).toEqual([
      ['buy', 'AAPL', 2, 400, undefined],
      ['dividend', 'AAPL', 0, 1, undefined],
      ['dividend', 'AAPL', 0, 0, 0.15],
      ['sell', 'AAPL', 1, 220, undefined],
      ['custody', '', 0, 1, undefined],
      ['ignore', '', 0, 100, undefined],
      ['split', 'TSLA', 2, null, undefined],
    ]);
    const pnl = read(`Income from Sells
Date acquired,Date sold,Symbol,Security name,ISIN,Country,Quantity,Cost basis,Gross proceeds,Gross PnL,Currency
05/01/2024,05/03/2025,AAPL,Apple Ficticia,US0000000001,US,1,180,220,40,USD
05/01/2024,05/03/2025,BTC,,,,0.01,300,400,100,EUR

Other income & fees
Date,Symbol,Security name,ISIN,Country,Gross amount,Withholding tax,Net Amount,Currency
05/02/2025,AAPL,Apple Ficticia,US0000000001,US,1.00,0.15,0.85,USD`);
    expect(pnl.map((r) => r.format?.id)).toEqual(['revolut-pnl', 'revolut-income']);
    expect(
      pnl[0].ops.map((o) => [o.kind, o.asset, o.cost, o.amount, o.acquired, o.assetClass])
    ).toEqual([
      ['realized', 'AAPL', 180, 220, '2024-01-05', 'shares'],
      ['realized', 'BTC', 300, 400, '2024-01-05', 'crypto'],
    ]);
    expect(pnl[1].ops[0]).toMatchObject({ kind: 'dividend', amount: 1, withholding: 0.15 });
    const savings = opsOf(`Date,Description,Value,Price per share,Quantity of shares
05/01/2025,BUY EUR Class R IE0000000001,1000,1,1000
06/01/2025,Interest PAID EUR Class R IE0000000001,0.10,,
06/01/2025,Service Fee Charged EUR Class R IE0000000001,-0.01,,
07/01/2025,SELL EUR Class R IE0000000001,500,1,500
08/01/2025,Something else,1,,`);
    expect(savings.map((o) => [o.kind, o.asset, o.units, o.amount])).toEqual([
      ['buy', 'CLASS R IE0000000001', 1000, 1000],
      ['dividend', 'CLASS R IE0000000001', 0, 0.1],
      ['sell', 'CLASS R IE0000000001', 500, 500],
    ]);
  });
});

describe('brokers', () => {
  it('eToro: closed positions (shares, ETF, crypto, CFD) and dividends', () => {
    const r = readTables(
      [
        {
          name: 'Closed Positions',
          rows: parseCSV(`Position ID,Action,Long / Short,Amount,Units / Contracts,Open Date,Close Date,Leverage,Spread Fees (USD),Market Spread (USD),Profit(USD),FX rate at open (USD),FX rate at close (USD),Open Rate,Close Rate,Take profit rate,Stop lose rate,Overnight Fees and Dividends,Copied From,Type,ISIN,Notes
1,Buy Apple,Long,200,1,05/01/2024 10:00:00,05/03/2025 10:00:00,1,0,0,20,1,1,200,220,0,0,0,-,Stocks,US0000000001,
2,Buy Vanguard,Long,100,1,05/01/2024 10:00:00,05/03/2025 10:00:00,1,0,0,-10,1,1,100,90,0,0,0,-,ETF,IE0000000002,
3,Buy Bitcoin,Long,300,0.01,05/01/2024 10:00:00,05/03/2025 10:00:00,1,0,0,100,1,1,30000,40000,0,0,0,-,Crypto,,
4,Sell Oil,Short,50,1,05/01/2025 10:00:00,05/03/2025 10:00:00,5,0,0,-5,1,1,70,71,0,0,0,-,CFD,,`),
        },
        {
          name: 'Closed Positions (older)',
          rows: parseCSV(`Position ID,Action,Amount,Units,Open Date,Close Date,Leverage,Spread,Profit,Open Rate,Close Rate,Type,ISIN
5,,100,1,05/01/2024 10:00:00,05/03/2025 10:00:00,,0,,100,100,Stocks,US0000000009
6,Buy Ficticia,100,1,05/01/2024 10:00:00,05/03/2025 10:00:00,1,0,12,100,112,Stocks,`),
        },
        {
          name: 'Dividends',
          rows: parseCSV(`Date of Payment,Instrument Name,Net Dividend Received (USD),Withholding Tax Rate (%),Withholding Tax Amount (USD),Position ID,Type,ISIN
05/02/2025,Apple,0.85,15 %,0.15,1,Stocks,US0000000001
06/02/2025,Ficticia,1.70,15 %,0.30,6,Stocks,`),
        },
      ],
      'etoro.xlsx'
    );
    expect(r[0].ops.map((o) => [o.asset, o.name, o.assetClass, o.cost, o.amount])).toEqual([
      ['US0000000001', 'APPLE', 'shares', 200, 220],
      ['IE0000000002', 'VANGUARD', 'etf', 100, 90],
      ['BITCOIN', 'BITCOIN', 'crypto', 300, 400],
      ['OIL', 'OIL', 'derivative', 50, 45],
    ]);
    expect(r[1].ops.map((o) => [o.asset, o.name, o.cost, o.amount])).toEqual([
      ['US0000000009', 'US0000000009', 100, 100],
      ['FICTICIA', 'FICTICIA', 100, 112],
    ]);
    expect(r[2].ops[1]).toMatchObject({ asset: 'FICTICIA', amount: 2 });
    expect(r[2].ops[0]).toMatchObject({
      kind: 'dividend',
      asset: 'US0000000001',
      amount: 1,
      withholding: 0.15,
      currency: 'USD',
    });
  });

  it('Degiro in Spanish and English: transactions and account (dividends, withholding, interest)', () => {
    const es =
      opsOf(`Fecha,Hora,Producto,ISIN,Bolsa de referencia,Centro de ejecución,Número,Precio,,Valor local,,Valor,,Tipo de cambio,Costes de transacción,,Total,,ID Orden
05-01-2025,10:00,EMPRESA FICTICIA SA,ES0000000001,MAD,XMAD,10,"10,00",EUR,"-100,00",EUR,"-100,00",EUR,,"-2,00",EUR,"-102,00",EUR,o1
05-03-2025,10:00,EMPRESA FICTICIA SA,ES0000000001,MAD,XMAD,-5,"12,00",EUR,"60,00",EUR,"60,00",EUR,,"-2,00",EUR,"58,00",EUR,o2
05-03-2025,10:00,VANGUARD FTSE ALL-WORLD UCITS ETF,IE0000000002,XET,XETR,0,"100,00",EUR,"0,00",EUR,"0,00",EUR,,,,"0,00",EUR,o3
06-03-2025,10:00,OTRA FICTICIA,,MAD,XMAD,1,"5,00",EUR,"-5,00",EUR,"-5,00",EUR,,,,"-5,00",EUR,o4`);
    expect(es.map((o) => [o.kind, o.asset, o.units, o.amount, o.currency, o.fee, o.at])).toEqual([
      ['buy', 'ES0000000001', 10, 100, 'EUR', 2, '2025-01-05T10:00:00'],
      ['sell', 'ES0000000001', 5, 60, 'EUR', 2, '2025-03-05T10:00:00'],
      ['buy', 'OTRA FICTICIA', 1, 5, 'EUR', 0, '2025-03-06T10:00:00'],
    ]);
    const en =
      opsOf(`Date,Time,Product,ISIN,Reference exchange,Venue,Quantity,Price,,Local value,,Value,,Exchange rate,Transaction and/or third,,Total,,Order ID
05-01-2025,10:00,VANGUARD FTSE ALL-WORLD UCITS ETF,IE0000000002,XET,XETR,2,100.00,EUR,-200.00,EUR,-200.00,EUR,,-1.00,EUR,-201.00,EUR,o1`);
    expect(en[0]).toMatchObject({
      kind: 'buy',
      asset: 'IE0000000002',
      assetClass: 'etf',
      amount: 200,
    });
    const account =
      opsOf(`Fecha,Hora,Fecha valor,Producto,ISIN,Descripción,Tipo,Variación,,Saldo,,ID Orden
05-02-2025,08:00,05-02-2025,APPLE FICTICIA,US0000000001,Dividendo,,USD,"1,00",USD,"1,00",
05-02-2025,08:00,05-02-2025,APPLE FICTICIA,US0000000001,Retención del dividendo,,USD,"-0,15",USD,"0,85",
05-02-2025,08:00,05-02-2025,,,Interés,,EUR,"0,50",EUR,"0,50",
05-02-2025,08:00,05-02-2025,,,Ingreso,,EUR,"100,00",EUR,"100,50",`);
    expect(account.map((o) => [o.kind, o.asset, o.amount, o.withholding, o.currency])).toEqual([
      ['dividend', 'US0000000001', 1, undefined, 'USD'],
      ['dividend', 'US0000000001', 0, 0.15, 'USD'],
      ['interest', '', 0.5, undefined, 'EUR'],
    ]);
    const accountEn =
      opsOf(`Date,Time,Value date,Product,ISIN,Description,FX,Change,,Balance,,Order Id
05-02-2025,08:00,05-02-2025,APPLE FICTICIA,US0000000001,Dividend,,USD,1.00,USD,1.00,
05-02-2025,08:00,05-02-2025,APPLE FICTICIA,US0000000001,Dividend Tax,,USD,-0.15,USD,0.85,`);
    expect(accountEn.map((o) => [o.kind, o.amount, o.withholding])).toEqual([
      ['dividend', 1, undefined],
      ['dividend', 0, 0.15],
    ]);
  });

  it('Interactive Brokers activity statement: sections for trades, dividends, withholding and interest', () => {
    const r = read(`Statement,Header,Field Name,Field Value
Statement,Data,Title,Activity Statement
Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,C. Price,Proceeds,Comm/Fee,Basis,Realized P/L,MTM P/L,Code
Trades,Data,Order,Stocks,USD,AAPL,"2025-01-05, 10:00:00",2,200,200,-400,-1,401,0,0,O
Trades,Data,Order,Stocks,USD,AAPL,"2025-03-05, 10:00:00",-1,220,220,220,-1,-200.5,18.5,0,C
Trades,Data,Order,Forex,EUR,EUR.USD,"2025-01-04, 10:00:00",1000,1.08,1.08,-1080,0,0,0,0,
Trades,SubTotal,,Stocks,USD,AAPL,,1,,,,,,,,
Trades,Data,ClosedLot,Stocks,USD,AAPL,2025-01-05,1,200,,,,200.5,,,
Dividends,Header,Currency,Date,Description,Amount
Dividends,Data,USD,2025-02-05,AAPL(US0000000001) Cash Dividend USD 0.50 per Share (Ordinary Dividend),1.00
Dividends,Data,Total,,,1.00
Withholding Tax,Header,Currency,Date,Description,Amount,Code
Withholding Tax,Data,USD,2025-02-05,AAPL(US0000000001) Cash Dividend USD 0.50 per Share - US Tax,-0.15,
Interest,Header,Currency,Date,Description,Amount
Interest,Data,EUR,2025-02-01,EUR Credit Interest for Jan-2025,0.40
Other,Data,x,y`);
    expect(r.map((x) => x.format?.id ?? null)).toEqual([
      null,
      'ibkr-trades',
      'ibkr-dividends',
      'ibkr-withholding',
      'ibkr-interest',
    ]);
    expect(r[1].ops.map((o) => [o.kind, o.asset, o.units, o.amount, o.fee])).toEqual([
      ['buy', 'AAPL', 2, 400, 1],
      ['sell', 'AAPL', 1, 220, 1],
    ]);
    expect(r[2].ops[0]).toMatchObject({ kind: 'dividend', asset: 'US0000000001', amount: 1 });
    expect(r[3].ops[0]).toMatchObject({ kind: 'dividend', withholding: 0.15, amount: 0 });
    expect(r[4].ops[0]).toMatchObject({ kind: 'interest', amount: 0.4, currency: 'EUR' });
  });

  it('Interactive Brokers Flex query', () => {
    const ops =
      opsOf(`ClientAccountID,CurrencyPrimary,FXRateToBase,AssetClass,Symbol,Description,ISIN,TradeDate,Quantity,TradePrice,Proceeds,IBCommission,Buy/Sell
U1,USD,0.92,STK,VWRA,VANGUARD FTSE ALL-WORLD UCITS ETF,IE0000000003,20250105,1,120,-120,-1,BUY
U1,USD,0.92,OPT,X,OPTION,,2025-01-06,1,1,-100,-1,BUY
U1,USD,0.92,CASH,EUR.USD,FX,,2025-01-07,1,1,-100,-1,BUY
U1,USD,0.92,STK,VWRA,VANGUARD FTSE ALL-WORLD UCITS ETF,IE0000000003,20250205;103000,1,130,130,-1,SELL`);
    expect(ops.map((o) => [o.kind, o.asset, o.assetClass, o.amount])).toEqual([
      ['buy', 'VWRA', 'etf', 120],
      ['buy', 'X', 'derivative', 100],
      ['sell', 'VWRA', 'etf', 130],
    ]);
    expect(ops[0].date).toBe('2025-01-05');
    expect(ops[2].at).toBe('2025-02-05T10:30:00');
  });

  it('Trading 212, Scalable Capital, Lightyear, XTB, Freedom24 and Trade Republic', () => {
    const t212 =
      opsOf(`Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Exchange rate,Result,Currency (Result),Total,Currency (Total),Withholding tax,Currency (Withholding tax),Currency conversion fee,Currency (Currency conversion fee)
Market buy,2025-01-05 10:00:00,US0000000001,AAPL,Apple Ficticia,2,200,USD,1.08,,,370.37,EUR,,,0.55,EUR
Dividend (Ordinary),2025-02-05 10:00:00,US0000000001,AAPL,Apple Ficticia,2,0.5,USD,1.08,,,0.79,EUR,0.15,USD,,
Deposit,2025-01-01 10:00:00,,,,,,,,,,1000,EUR,,,,
Interest on cash,2025-02-01 10:00:00,,,,,,,,,,0.30,EUR,,,,`);
    expect(t212.map((o) => [o.kind, o.asset, o.amount, o.fee, o.withholding])).toEqual([
      ['buy', 'AAPL', 370.37, 0.55, undefined],
      ['dividend', 'AAPL', 0.79, 0, 0.15],
      ['ignore', '', 1000, 0, undefined],
      ['interest', '', 0.3, 0, undefined],
    ]);
    const scalable =
      opsOf(`date;time;status;reference;description;assetType;type;isin;shares;price;amount;fee;tax;currency
2025-01-05;10:00:00;Executed;R1;Fondo Indexado Ficticio ETF;Security;Savings plan;IE0000000004;"2";"50,00";"-100,00";"0,00";"0,00";EUR
2025-01-06;10:00:00;Executed;R2;Fondo Indexado Ficticio ETF;Security;Sell;IE0000000004;"1";"55,00";"55,00";"0,99";"0,00";EUR
2025-01-07;10:00:00;Executed;R3;Cash;Cash;Interest;;;;"1,20";"0,00";"0,00";EUR
2025-01-08;10:00:00;Executed;R4;Cash;Cash;Deposit;;;;"500,00";"0,00";"0,00";EUR
2025-01-09;10:00:00;Cancelled;R5;Fondo Indexado Ficticio ETF;Security;Buy;IE0000000004;"1";"50,00";"-50,00";"0,00";"0,00";EUR
2025-01-10;10:00:00;Executed;R6;Fondo Indexado Ficticio ETF;Security;Distribution;IE0000000004;;;"0,80";"0,00";"0,00";EUR
2025-01-11;10:00:00;Executed;R7;Cash;Cash;Distribution;;;;"0,80";"0,00";"0,00";EUR
2025-01-12;10:00:00;Executed;R8;X;Security;Mystery;;;;"0,80";"0,00";"0,00";EUR`);
    expect(scalable.map((o) => [o.kind, o.asset, o.units, o.amount, o.fee])).toEqual([
      ['buy', 'IE0000000004', 2, 100, 0],
      ['sell', 'IE0000000004', 1, 55, 0.99],
      ['interest', 'CASH', 0, 1.2, 0],
      ['dividend', 'IE0000000004', 0, 0.8, 0],
    ]);
    const lightyear =
      opsOf(`Date,Reference,Ticker,ISIN,Type,Quantity,CCY,Price/share,Gross Amount,FX Rate,Fee,Net Amt.,Tax Amt.
05/01/2025 10:00:00,R1,AAPL,US0000000001,Buy,2,USD,200,400,,1,401,
05/02/2025 10:00:00,R2,AAPL,US0000000001,Dividend,,USD,,1,,,0.85,0.15`);
    expect(lightyear.map((o) => [o.kind, o.amount, o.withholding])).toEqual([
      ['buy', 400, undefined],
      ['dividend', 1, 0.15],
    ]);
    const xtb = opsOf(`ID,Type,Time,Comment,Symbol,Amount
1,Stocks/ETF purchase,05.01.2025 10:00:00,OPEN BUY 10 @ 10.00,SAN.ES,-100
2,Stocks/ETF sale,05.03.2025 10:00:00,CLOSE BUY 4/10 @ 12.00,SAN.ES,48
3,DIVIDENT,05.02.2025 10:00:00,SAN.ES EUR 0.10/ SHR,SAN.ES,1.00
4,Withholding tax,05.02.2025 10:00:00,SAN.ES EUR WHT 19%,SAN.ES,-0.19
5,Free-funds Interest,05.02.2025 10:00:00,Interest,,0.20
6,deposit,05.01.2025 09:00:00,deposit,,500`);
    expect(xtb.map((o) => [o.kind, o.asset, o.units, o.amount, o.withholding])).toEqual([
      ['buy', 'SAN.ES', 10, 100, undefined],
      ['sell', 'SAN.ES', 4, 48, undefined],
      ['dividend', 'SAN.ES', 0, 1, undefined],
      ['dividend', 'SAN.ES', 0, 0, 0.19],
      ['interest', 'INTERÉS', 0, 0.2, undefined],
    ]);
    const f24 =
      opsOf(`Trade date,Settlement date,Ticker,ISIN,Operation,Quantity,Price,Currency,Amount,Commission
2025-01-05,2025-01-07,AAPL.US,US0000000001,Buy,2,200,USD,400,2`);
    expect(f24[0]).toMatchObject({ kind: 'buy', amount: 400, fee: 2, currency: 'USD' });
    // Trade Republic (NO CONFIRMADO): read with the usual Spanish column names.
    const tr = opsOf(`Fecha;Tipo;Nombre;ISIN;Participaciones;Importe;Comisión;Impuestos
05/01/2025;Plan de inversión;Fondo Indexado Ficticio ETF;IE0000000004;"1,5";"-75,00";"0,00";"0,00"
05/02/2025;Distribución;Fondo Indexado Ficticio ETF;IE0000000004;;"0,50";"0,00";"0,10"`);
    expect(tr.map((o) => [o.kind, o.assetClass, o.units, o.amount])).toEqual([
      ['buy', 'etf', 1.5, 75],
      ['dividend', 'etf', 0, 0.5],
    ]);
  });

  it('Schwab and Fidelity (United States: month first, dollars)', () => {
    const schwab =
      opsOf(`"Date","Action","Symbol","Description","Quantity","Price","Fees & Comm","Amount"
"01/05/2025","Buy","AAPL","APPLE FICTICIA","2","$200.00","","-$400.00"
"02/05/2025","Qualified Dividend","AAPL","APPLE FICTICIA","","","","$1.00"
"02/05/2025","NRA Tax Adj","AAPL","APPLE FICTICIA","","","","-$0.15"
"03/05/2025","Sell","AAPL","APPLE FICTICIA","1","$220.00","$0.05","$219.95"
"03/06/2025","Journal","","","","","","$5.00"
"03/07/2025","NRA Tax Adj","AAPL","APPLE FICTICIA","","","",""`);
    expect(schwab.map((o) => [o.kind, o.date, o.units, o.amount, o.withholding])).toEqual([
      ['buy', '2025-01-05', 2, 400, undefined],
      ['dividend', '2025-02-05', 0, 1, undefined],
      ['dividend', '2025-02-05', 0, 0, 0.15],
      ['sell', '2025-03-05', 1, 219.95, undefined],
      ['dividend', '2025-03-07', 0, 0, 0],
    ]);
    const fidelity =
      opsOf(`Run Date,Action,Symbol,Security Description,Security Type,Quantity,Price ($),Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date
01/05/2025,YOU BOUGHT APPLE FICTICIA (AAPL) (Cash),AAPL,APPLE FICTICIA,Cash,2,200,0,0,,-400,01/07/2025
02/05/2025,DIVIDEND RECEIVED APPLE FICTICIA (AAPL) (Cash),AAPL,APPLE FICTICIA,Cash,0,,,,,1.00,
02/05/2025,FOREIGN TAX PAID APPLE FICTICIA (AAPL) (Cash),AAPL,APPLE FICTICIA,Cash,0,,,,,-0.15,
02/06/2025,ELECTRONIC FUNDS TRANSFER,,,Cash,0,,,,,100,`);
    expect(fidelity.map((o) => [o.kind, o.amount, o.withholding])).toEqual([
      ['buy', 400, undefined],
      ['dividend', 1, undefined],
      ['dividend', 0, 0.15],
    ]);
  });
});

describe('Spanish funds (MyInvestor, Indexa, Openbank, BBVA…: usual column names)', () => {
  it('reads subscriptions, repayments with withholding, fund transfers with tax data and income', () => {
    const r = read(`Movimientos de fondos;;;;;;;;;
Fecha de operación;Fondo;ISIN;Tipo de operación;Participaciones;Valor liquidativo;Importe;Retención;Coste fiscal;Fecha de adquisición
05/01/2022;Fondo Indexado Ficticio Mundial FI;ES0000000010;Suscripción;100;10,00;1.000,00;;;
05/03/2025;Fondo Indexado Ficticio Mundial FI;ES0000000010;Traspaso de salida;50;12,00;600,00;;;
06/03/2025;Fondo Ficticio Renta Fija FI;ES0000000011;Traspaso de entrada;60;10,00;600,00;;500,00;05/01/2022
05/06/2025;Fondo Indexado Ficticio Mundial FI;ES0000000010;Reembolso;50;13,00;650,00;28,50;;
05/07/2025;Fondo Ficticio Renta Fija FI;ES0000000011;Dividendo;;;10,00;1,90;;
05/08/2025;Fondo Ficticio Renta Fija FI;ES0000000011;Comisión de custodia;;;5,00;;;
05/09/2025;Fondo Ficticio Renta Fija FI;ES0000000011;Cupón;;;3,00;0,57;;
05/10/2025;Fondo Ficticio Renta Fija FI;ES0000000011;Otro movimiento;;;3,00;;;
05/11/2025;;ES0000000012;Suscripción;10;10,00;100,00;;;`);
    expect(r[0].format?.id).toBe('es-funds');
    expect(r[0].skipped).toBe(1);
    expect(
      r[0].ops.map((o) => [o.kind, o.asset, o.units, o.amount, o.withholding, o.cost, o.acquired])
    ).toEqual([
      ['buy', 'ES0000000010', 100, 1000, undefined, undefined, undefined],
      ['switchOut', 'ES0000000010', 50, 600, undefined, undefined, undefined],
      ['switchIn', 'ES0000000011', 60, 600, undefined, 500, '2022-01-05'],
      ['sell', 'ES0000000010', 50, 650, 28.5, undefined, undefined],
      ['dividend', 'ES0000000011', 0, 10, 1.9, undefined, undefined],
      ['custody', 'ES0000000011', 0, 5, undefined, undefined, undefined],
      ['interest', 'ES0000000011', 0, 3, 0.57, undefined, undefined],
      ['buy', 'ES0000000012', 10, 100, undefined, undefined, undefined],
    ]);
    expect(r[0].ops[0].assetClass).toBe('fund');
  });

  it('an ETF bought through a Spanish bank is an ETF, not a fund', () => {
    const ops = opsOf(`Fecha;Valor;ISIN;Operación;Participaciones;Importe
05/01/2025;iShares Ficticio ETF;IE0000000005;Compra;10;500,00`);
    expect(ops[0].assetClass).toBe('etf');
  });
});

describe('files that are not of a known platform', () => {
  it('give their header for the guided mapping', () => {
    const r = read(`Informe;;
;;
Día;Cosa;Cuánto;Moneda
01/01/2025;BTC;1;EUR`);
    expect(r[0]).toMatchObject({
      format: null,
      headerRow: 1,
      header: ['Día', 'Cosa', 'Cuánto', 'Moneda'],
    });
    expect(readTables([{ name: 'empty', rows: [] }], 'f')[0]).toMatchObject({
      headerRow: 0,
      header: [],
    });
  });

  it('skip rows without a date', () => {
    const r = read(`Symbol,Type,Quantity,Price,Value,Fees,Date
BTC,Buy,0.01,€1,€1,€0,not a date`);
    expect(r[0]).toMatchObject({ skipped: 1, ops: [] });
  });
});
