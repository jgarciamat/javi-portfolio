import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useToggleSet } from '@shared/hooks/useToggleSet';
import {
  ASSET_CLASSES,
  assetSearchText,
  matchesQuery,
  riskBand,
  type RiskBand,
} from '../domain/content';
import { AssetCard } from './AssetCard';
import { Heatmap, TaxGlance } from './Heatmap';

const BANDS: RiskBand[] = ['low', 'mid', 'high'];

/** The 12 asset classes as expandable cards, with search, a risk filter and the summary tables. */
export function AssetMap({ onOpenChapter }: { onOpenChapter: (id: string) => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [band, setBand] = useState<RiskBand | null>(null);
  const open = useToggleSet();
  const shown = ASSET_CLASSES.filter(
    (a) => matchesQuery(assetSearchText(a), query) && (band === null || riskBand(a.risk) === band)
  );

  return (
    <div className="inv-map">
      <p className="inv-lead">{t('app.invest.map.lead', { total: ASSET_CLASSES.length })}</p>
      <input
        type="search"
        className="tx-input inv-search"
        placeholder={t('app.invest.map.search')}
        aria-label={t('app.invest.map.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="inv-filters" role="group" aria-label={t('app.invest.map.filter')}>
        <button
          type="button"
          className={`inv-pill${band === null ? ' inv-pill--on' : ''}`}
          aria-pressed={band === null}
          onClick={() => setBand(null)}
        >
          {t('app.invest.filter.all')}
        </button>
        {BANDS.map((b) => (
          <button
            key={b}
            type="button"
            className={`inv-pill inv-pill--${b}${band === b ? ' inv-pill--on' : ''}`}
            aria-pressed={band === b}
            onClick={() => setBand(band === b ? null : b)}
          >
            {t(`app.invest.risk.${b}`)}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="inv-empty">{t('app.invest.map.empty')}</p>}
      <ul className="inv-assets">
        {shown.map((a) => (
          <AssetCard
            key={a.id}
            asset={a}
            open={open.has(a.id)}
            onToggle={() => open.toggle(a.id)}
            onOpenChapter={onOpenChapter}
          />
        ))}
      </ul>
      <Heatmap />
      <TaxGlance />
    </div>
  );
}
