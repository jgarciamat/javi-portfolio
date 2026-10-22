import type { CSSProperties } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { LAYER_SECTION, type GuideSection } from '../domain/guide';
import { LAYER_COLORS, type LayerId } from '../domain/indicators';

const GROUPS: { id: string; layers: LayerId[] }[] = [
  { id: 'averages', layers: ['ema20', 'ema50', 'ema200'] },
  { id: 'bands', layers: ['bollinger', 'vwap'] },
  { id: 'levels', layers: ['profile', 'levels', 'fibonacci'] },
];

/**
 * Small chips in one bar that wraps, grouped, each with its colour and a «?» that opens the guide
 * where that layer is explained. Reading aids, never signals.
 */
export function LayerBar({
  active,
  onToggle,
  onGuide,
}: {
  active: LayerId[];
  onToggle: (layer: LayerId) => void;
  onGuide: (section: GuideSection) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="cc-layers">
      <div className="cc-layers-bar">
        <h3>{t('app.crypto.layers.title')}</h3>
        {GROUPS.map((group) => (
          <div
            key={group.id}
            className="cc-layer-group"
            role="group"
            aria-label={t(`app.crypto.layers.groups.${group.id}`)}
          >
            <span className="cc-layer-group-name" aria-hidden="true">
              {t(`app.crypto.layers.groups.${group.id}`)}
            </span>
            {group.layers.map((layer) => {
              const name = t(`app.crypto.layers.names.${layer}`);
              return (
                <span
                  key={layer}
                  className="cc-layer"
                  style={{ '--cc-layer': LAYER_COLORS[layer] } as CSSProperties}
                >
                  <button
                    type="button"
                    className="cc-layer-chip"
                    aria-pressed={active.includes(layer)}
                    onClick={() => onToggle(layer)}
                  >
                    <i aria-hidden="true" />
                    {name}
                  </button>
                  <button
                    type="button"
                    className="cc-layer-help"
                    aria-label={t('app.crypto.layers.whatIs', { name })}
                    onClick={() => onGuide(LAYER_SECTION[layer])}
                  >
                    ?
                  </button>
                </span>
              );
            })}
          </div>
        ))}
        <button type="button" className="cc-guide-open" onClick={() => onGuide('candles')}>
          {t('app.crypto.layers.guide')}
        </button>
      </div>
      <p className="cc-layers-note">{t('app.crypto.layers.note')}</p>
    </div>
  );
}
