/**
 * What each visual layer of the chart draws: lines that follow the candles (averages, bands,
 * VWAP) and horizontal levels (volume profile, supports and resistances, Fibonacci), plus the
 * values for the legend. Reading aids only: no signals, no forecasts.
 */
import {
  LAYERS,
  bollinger,
  ema,
  fibonacci,
  lastValue,
  supportResistance,
  volumeProfile,
  vwap,
  type LayerId,
} from './indicators';
import type { Candle } from './types';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export interface LayerLine {
  key: string;
  layer: LayerId;
  values: (number | null)[];
  dashed: boolean;
}

export interface LayerLevel {
  key: string;
  layer: LayerId;
  price: number;
  title: string;
  dashed: boolean;
}

export interface LegendItem {
  layer: LayerId;
  values: { label: string; price: number | null }[];
}

const EMA_PERIODS: Partial<Record<LayerId, number>> = { ema20: 20, ema50: 50, ema200: 200 };

/** Lines that follow the candles, for the layers that are on. */
export function layerLines(candles: Candle[], active: LayerId[]): LayerLine[] {
  const closes = candles.map((c) => c.close);
  const lines: LayerLine[] = [];
  for (const layer of LAYERS.filter((l) => active.includes(l))) {
    const period = EMA_PERIODS[layer];
    if (period) lines.push({ key: layer, layer, values: ema(closes, period), dashed: false });
    if (layer === 'bollinger') {
      const bands = bollinger(closes, 20, 2);
      lines.push(
        { key: 'bb-upper', layer, values: bands.upper, dashed: true },
        { key: 'bb-middle', layer, values: bands.middle, dashed: false },
        { key: 'bb-lower', layer, values: bands.lower, dashed: true }
      );
    }
    if (layer === 'vwap') lines.push({ key: layer, layer, values: vwap(candles), dashed: false });
  }
  return lines;
}

const percent = (ratio: number, locale: 'es' | 'en') =>
  `${new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'es-ES', {
    maximumFractionDigits: 1,
  }).format(ratio * 100)} %`;

/**
 * Horizontal levels of the layers that are on. The volume profile and Fibonacci use the candles on
 * screen (`range`, logical indexes) so they follow what the person is looking at.
 */
export function layerLevels(
  candles: Candle[],
  active: LayerId[],
  range: { from: number; to: number } | null,
  t: Translate,
  locale: 'es' | 'en'
): LayerLevel[] {
  const from = range ? Math.max(0, Math.ceil(range.from)) : 0;
  const to = range ? Math.floor(range.to) : candles.length - 1;
  const visible = candles.slice(from, to + 1);
  const levels: LayerLevel[] = [];
  if (active.includes('profile')) {
    const profile = volumeProfile(visible);
    if (profile) {
      levels.push(
        { key: 'poc', layer: 'profile', price: profile.poc, title: 'POC', dashed: false },
        { key: 'vah', layer: 'profile', price: profile.vah, title: 'VAH', dashed: true },
        { key: 'val', layer: 'profile', price: profile.val, title: 'VAL', dashed: true }
      );
    }
  }
  if (active.includes('levels')) {
    supportResistance(candles).forEach((level, i) =>
      levels.push({
        key: `level-${i}`,
        layer: 'levels',
        price: level.price,
        title: t(`app.crypto.layers.${level.kind}`),
        dashed: true,
      })
    );
  }
  if (active.includes('fibonacci')) {
    fibonacci(candles, from, to)?.levels.forEach(({ ratio, price }) =>
      levels.push({
        key: `fib-${ratio}`,
        layer: 'fibonacci',
        price,
        title: `Fibo ${percent(ratio, locale)}`,
        dashed: ratio !== 0 && ratio !== 1,
      })
    );
  }
  return levels;
}

/** Values of each layer that is on, for the legend above the chart. */
export function legend(
  lines: LayerLine[],
  levels: LayerLevel[],
  active: LayerId[],
  t: Translate
): LegendItem[] {
  return LAYERS.filter((l) => active.includes(l)).map((layer) => {
    const own = lines.filter((l) => l.layer === layer);
    if (own.length) {
      return {
        layer,
        values: own.map((l) => ({
          label: t(`app.crypto.layers.legend.${l.key}`),
          price: lastValue(l.values),
        })),
      };
    }
    return {
      layer,
      values: levels
        .filter((l) => l.layer === layer)
        .map((l) => ({ label: l.title, price: l.price })),
    };
  });
}
