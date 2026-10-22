import { translate } from '@core/i18n/I18nContext';
import { LAYER_SECTION } from '@modules/crypto/domain/guide';
import { LAYERS } from '@modules/crypto/domain/indicators';
import { layerLevels, layerLines, legend } from '@modules/crypto/domain/layers';
import type { Candle } from '@modules/crypto/domain/types';

const t = (key: string, vars?: Record<string, string | number>) => translate('es', key, vars);

// Made-up candles going up and down so that every layer has something to show.
const candles: Candle[] = Array.from({ length: 60 }, (_, i) => {
  const mid = 100 + 10 * Math.sin(i / 4);
  return {
    time: i * 3_600_000,
    open: mid - 1,
    high: mid + 2,
    low: mid - 2,
    close: mid + 1,
    volume: 5 + (i % 7),
  };
});

describe('chart layers', () => {
  it('draws the lines of the layers that are on, in order', () => {
    expect(layerLines(candles, [])).toEqual([]);
    const lines = layerLines(candles, ['vwap', 'ema20', 'bollinger', 'ema200']);
    expect(lines.map((l) => l.key)).toEqual([
      'ema20',
      'ema200',
      'bb-upper',
      'bb-middle',
      'bb-lower',
      'vwap',
    ]);
    expect(lines.find((l) => l.key === 'ema200')!.values.every((v) => v === null)).toBe(true);
    expect(lines.find((l) => l.key === 'bb-upper')!.dashed).toBe(true);
  });

  it('puts the levels of the profile, supports and Fibonacci on the candles on screen', () => {
    const levels = layerLevels(
      candles,
      ['profile', 'levels', 'fibonacci'],
      { from: 10.4, to: 40.6 },
      t,
      'es'
    );
    expect(levels.filter((l) => l.layer === 'profile').map((l) => l.title)).toEqual([
      'POC',
      'VAH',
      'VAL',
    ]);
    expect(levels.filter((l) => l.layer === 'fibonacci').map((l) => l.title)).toEqual([
      'Fibo 0 %',
      'Fibo 23,6 %',
      'Fibo 38,2 %',
      'Fibo 50 %',
      'Fibo 61,8 %',
      'Fibo 78,6 %',
      'Fibo 100 %',
    ]);
    expect(levels.find((l) => l.key === 'fib-0')!.dashed).toBe(false);
    expect(levels.some((l) => l.title === 'Soporte' || l.title === 'Resistencia')).toBe(true);
    expect(layerLevels(candles, ['fibonacci'], null, t, 'en')[1].title).toBe('Fibo 23.6 %');
    expect(layerLevels([], ['profile', 'fibonacci', 'levels'], null, t, 'es')).toEqual([]);
  });

  it('gives the legend the last value of each line or the levels', () => {
    const lines = layerLines(candles, ['ema20', 'ema200']);
    const levels = layerLevels(candles, ['profile'], null, t, 'es');
    const items = legend(lines, levels, ['ema200', 'profile', 'ema20', 'fibonacci'], t);
    expect(items.map((i) => i.layer)).toEqual(['ema20', 'ema200', 'profile', 'fibonacci']);
    expect(items[0].values[0]).toMatchObject({ label: 'Ahora' });
    expect(items[0].values[0].price).toBeGreaterThan(0);
    expect(items[1].values[0].price).toBeNull();
    expect(items[2].values.map((v) => v.label)).toEqual(['POC', 'VAH', 'VAL']);
    expect(items[3].values).toEqual([]);
  });

  it('opens the guide where each layer is explained', () => {
    expect(LAYERS.every((l) => typeof LAYER_SECTION[l] === 'string')).toBe(true);
  });
});
