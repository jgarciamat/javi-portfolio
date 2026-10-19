import { amountOf, norm, parseMoney, parseWhen, toNumber } from '@modules/tools/domain/invest/text';
import { parseEcb, rateOn, toEur, withTyped } from '@modules/tools/domain/invest/fx';
import {
  FIAT,
  brokerClass,
  cleanAsset,
  kindOf,
  splitPair,
} from '@modules/tools/domain/invest/read';

describe('numbers and money as files write them', () => {
  it('reads both decimal styles and leaves thousands alone', () => {
    expect(toNumber('1,234.56', 'en')).toBe(1234.56);
    expect(toNumber('1.234,56', 'es')).toBe(1234.56);
    expect(toNumber('1,234', 'en')).toBe(1234);
    expect(toNumber('1,234', 'es')).toBe(1.234);
    expect(toNumber('1.234', 'es')).toBe(1234);
    expect(toNumber('1.234', 'en')).toBe(1.234);
    expect(toNumber('0.125', 'en')).toBe(0.125);
    expect(toNumber('15000', 'en')).toBe(15000);
    expect(toNumber("1'234.5", 'en')).toBe(1234.5);
    expect(toNumber('abc', 'en')).toBeNaN();
    expect(toNumber('5.19399e17', 'en')).toBe(5.19399e17);
  });

  it('takes the currency written before or after the number, and the sign', () => {
    expect(parseMoney('€1,234.56', 'en')).toEqual({ value: 1234.56, currency: 'EUR' });
    expect(parseMoney('-15000USDT', 'en')).toEqual({ value: -15000, currency: 'USDT' });
    expect(parseMoney('USD 12.30', 'en')).toEqual({ value: 12.3, currency: 'USD' });
    expect(parseMoney('0.5 BTC', 'en')).toEqual({ value: 0.5, currency: 'BTC' });
    expect(parseMoney('-€12', 'en')).toEqual({ value: -12, currency: 'EUR' });
    expect(parseMoney('$-36.12', 'en')).toEqual({ value: -36.12, currency: 'USD' });
    expect(parseMoney('+₮2,000.00', 'en')).toEqual({ value: 2000, currency: 'USDT' });
    expect(parseMoney('(45,10)', 'es')).toEqual({ value: -45.1, currency: null });
    expect(parseMoney('£3', 'en').currency).toBe('GBP');
    expect(parseMoney(7, 'en')).toEqual({ value: 7, currency: null });
    expect(parseMoney('5.19399e17', 'en')).toEqual({ value: 5.19399e17, currency: null });
    expect(parseMoney('-1e3', 'en')).toEqual({ value: -1000, currency: null });
    expect(parseMoney(null, 'en').value).toBeNaN();
    expect(parseMoney('12 34 X', 'en').value).toBeNaN();
    expect(amountOf('n/a', 'en')).toBe(0);
    expect(amountOf('2,5', 'es')).toBe(2.5);
  });

  it('normalises headers and words', () => {
    expect(norm('  Fecha   Operación ')).toBe('fecha operacion');
    expect(norm(null)).toBe('');
  });
});

describe('dates', () => {
  it('reads ISO, day-first, month-first, Unix and Excel dates', () => {
    expect(parseWhen('2025-03-14 10:22:01')).toEqual({
      date: '2025-03-14',
      at: '2025-03-14T10:22:01',
    });
    expect(parseWhen('2025-03-14T10:22:01Z')?.at).toBe('2025-03-14T10:22:01');
    expect(parseWhen('2025/3/4')?.date).toBe('2025-03-04');
    expect(parseWhen('14/03/2025')?.date).toBe('2025-03-14');
    expect(parseWhen('03/14/2025', 'mdy')?.date).toBe('2025-03-14');
    expect(parseWhen('14-03-25 9:05')?.at).toBe('2025-03-14T09:05:00');
    expect(parseWhen('27/04/2020 11:08:37 PM')?.at).toBe('2020-04-27T23:08:37');
    expect(parseWhen('27/04/2020 12:08:37 AM')?.at).toBe('2020-04-27T00:08:37');
    expect(parseWhen(1710412800)?.date).toBe('2024-03-14');
    expect(parseWhen('1710412800')?.date).toBe('2024-03-14');
    expect(parseWhen(1710412800000)?.date).toBe('2024-03-14');
    expect(parseWhen(45730)?.date).toBe('2025-03-14');
    expect(parseWhen(20250105)?.date).toBe('2025-01-05');
    expect(parseWhen('20250105;103000')?.at).toBe('2025-01-05T10:30:00');
    expect(parseWhen(12)).toBeNull();
    expect(parseWhen('31/02/2025')).toBeNull();
    expect(parseWhen('yesterday')).toBeNull();
    expect(parseWhen(null)).toBeNull();
  });
});

describe('exchange rates (ECB)', () => {
  const ecb =
    'Date,USD,JPY,GBP,\n2025-03-14,1.0880,161.2,N/A,\n2025-03-13,1.0850,160.1,0.84,\nbad,1,1,1,\n';

  it('keeps each currency oldest first and uses the last day published before', () => {
    const table = parseEcb(ecb);
    expect(table.USD).toEqual([
      ['2025-03-13', 1.085],
      ['2025-03-14', 1.088],
    ]);
    expect(table.GBP).toEqual([['2025-03-13', 0.84]]);
    expect(rateOn(table, 'USD', '2025-03-16')).toBe(1.088);
    expect(rateOn(table, 'USD', '2025-03-13')).toBe(1.085);
    expect(rateOn(table, 'USD', '2025-03-01')).toBeNull();
    expect(rateOn(table, 'CHF', '2025-03-14')).toBeNull();
    expect(rateOn({ CHF: [] }, 'CHF', '2025-03-14')).toBeNull();
    expect(Object.keys(parseEcb(ecb, new Set(['USD'])))).toEqual(['USD']);
    expect(parseEcb('')).toEqual({});
  });

  it('takes amounts to euros: directly, with the rate, or as a stablecoin', () => {
    const table = withTyped(parseEcb(ecb), 'CHF', 0.95);
    expect(toEur(100, 'EUR', '2025-03-14', table, FIAT)).toEqual({ eur: 100, how: 'eur' });
    expect(toEur(108.8, 'USD', '2025-03-14', table, FIAT).eur).toBeCloseTo(100);
    expect(toEur(108.8, 'USD', '2025-03-14', table, FIAT).how).toBe('rate');
    expect(toEur(108.8, 'USDT', '2025-03-14', table, FIAT).how).toBe('stable');
    expect(toEur(5, 'EURC', '2025-03-14', table, FIAT)).toEqual({ eur: 5, how: 'stable' });
    expect(toEur(95, 'CHF', '2025-03-14', table, FIAT).eur).toBeCloseTo(100);
    expect(toEur(1, 'GBP', '2025-01-01', table, FIAT).how).toBe('missingRate');
    expect(toEur(1, 'BTC', '2025-01-01', table, FIAT).how).toBe('notMoney');
    expect(toEur(1, null, '2025-01-01', table, FIAT).how).toBe('notMoney');
  });
});

describe('assets, pairs and words', () => {
  it('splits pairs and cleans the old Kraken codes', () => {
    expect(splitPair('BTC-EUR')).toEqual(['BTC', 'EUR']);
    expect(splitPair('eth/btc')).toEqual(['ETH', 'BTC']);
    expect(splitPair('XXBTZEUR')).toEqual(['XXBT', 'ZEUR']);
    expect(splitPair('SOLUSDT')).toEqual(['SOL', 'USDT']);
    expect(splitPair('ABC')).toBeNull();
    expect(cleanAsset('XXBT')).toBe('BTC');
    expect(cleanAsset('ZEUR')).toBe('EUR');
    expect(cleanAsset('XETH')).toBe('ETH');
    expect(cleanAsset('ETH2.S')).toBe('ETH');
    expect(cleanAsset('DOT.S')).toBe('DOT');
    expect(cleanAsset('XXDG')).toBe('DOGE');
    expect(cleanAsset('XTZ')).toBe('XTZ');
    expect(cleanAsset('ZZEC')).toBe('ZZEC');
    expect(cleanAsset(' sol ')).toBe('SOL');
  });

  it('guesses ETFs by their name and reads type words with rules', () => {
    expect(brokerClass('iShares Core MSCI World UCITS ETF', 'shares')).toBe('etf');
    expect(brokerClass('Empresa Ficticia SA', 'shares')).toBe('shares');
    expect(brokerClass('Vanguard', 'fund')).toBe('fund');
    expect(kindOf('Compra', [[/compra/, 'buy']])).toEqual(['buy', undefined]);
    expect(kindOf('Otra', [[/compra/, 'buy']])).toBeNull();
  });
});
