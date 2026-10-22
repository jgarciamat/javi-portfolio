import type { CSSProperties } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { LAYERS, LAYER_COLORS, type LayerId } from '../domain/indicators';
import type { LegendItem } from '../domain/layers';
import { useMoney } from './money';

/**
 * Small chips just above the chart, one after the other in a bar that wraps: a colour mark and
 * the short name. Pressed, the layer is drawn and the chip takes its colour; an average or the
 * VWAP also shows its value now, and the rest give their values in the tooltip (and to screen
 * readers). Reading aids, never signals.
 */
export function LayerBar({
  active,
  legend,
  onToggle,
}: {
  active: LayerId[];
  /** Values of the layers that are on. */
  legend: LegendItem[];
  onToggle: (layer: LayerId) => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const price = (value: number | null) => (value === null ? '—' : money.shownPrice(value));
  return (
    <div className="cc-layers" role="group" aria-label={t('app.crypto.layers.title')}>
      {LAYERS.map((layer) => {
        const values = legend.find((item) => item.layer === layer)?.values;
        const name = t(`app.crypto.layers.names.${layer}`);
        const detail = !values
          ? null
          : values.length
            ? values.map((v) => `${v.label} ${price(v.price)}`).join(', ')
            : t('app.crypto.layers.noData');
        return (
          <button
            key={layer}
            type="button"
            className="cc-layer"
            style={{ '--cc-layer': LAYER_COLORS[layer] } as CSSProperties}
            aria-pressed={active.includes(layer)}
            title={detail ? `${name}: ${detail}` : name}
            onClick={() => onToggle(layer)}
          >
            <i aria-hidden="true" />
            {t(`app.crypto.layers.short.${layer}`)}
            {/* A single value fits in the chip; several go in the tooltip. */}
            {values?.length === 1 ? (
              <small> · {price(values[0].price)}</small>
            ) : (
              detail && <span className="sr-only">: {detail}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
