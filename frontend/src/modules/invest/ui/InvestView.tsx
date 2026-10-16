import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { CALC_IDS, InvestCalc } from './calculators/Calculators';
import { CHART_IDS, InvestChart } from './charts/Charts';
import { AssetMap } from './AssetMap';
import { Learn } from './Learn';
import { MarketsPanel } from './MarketsPanel';
import '../../finances/ui/css/Sections.css';
import './css/Invest.css';

const SECTIONS = ['map', 'learn', 'markets', 'charts', 'calcs'] as const;
type SectionId = (typeof SECTIONS)[number];

const ICONS: Record<SectionId, string> = {
  map: '🗺️',
  learn: '📚',
  markets: '🌍',
  charts: '📉',
  calcs: '🧮',
};

function Disclaimer() {
  const { t } = useI18n();
  return (
    <aside className="inv-disclaimer" role="note" aria-label={t('app.invest.disclaimer.title')}>
      <strong>⚠️ {t('app.invest.disclaimer.title')}</strong>
      <ul className="inv-key-points">
        <li>{t('app.invest.disclaimer.key1')}</li>
        <li>{t('app.invest.disclaimer.key2')}</li>
        <li>{t('app.invest.disclaimer.key3')}</li>
      </ul>
      <p>{t('app.invest.disclaimer.edu')}</p>
      <p>{t('app.invest.disclaimer.risk')}</p>
      <details>
        <summary>{t('app.invest.disclaimer.more')}</summary>
        <ul>
          <li>{t('app.invest.disclaimer.past')}</li>
          <li>{t('app.invest.disclaimer.advisor')}</li>
          <li>{t('app.invest.disclaimer.figures')}</li>
        </ul>
      </details>
    </aside>
  );
}

/** Keeps the section menu under the header of the app, whatever its height is. */
function useHeaderOffset(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const update = () => {
      const header = document.querySelector('.dashboard-sticky');
      const height = header ? header.getBoundingClientRect().height : 0;
      (ref.current as HTMLDivElement).style.setProperty('--inv-top', `${height}px`);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref]);
}

/** The "Invest" tab: asset map, educational chapters, market hours, charts and calculators. */
export function InvestView() {
  const { t } = useI18n();
  const [section, setSection] = useState<SectionId>('map');
  const root = useRef<HTMLDivElement>(null);
  useHeaderOffset(root);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    setSection(SECTIONS[(index + step + SECTIONS.length) % SECTIONS.length]);
  };

  return (
    <div className="section-view invest" ref={root}>
      <div className="card inv-hero">
        <h2 className="section-title">
          <Icon name="coins" /> {t('app.invest.title')}
        </h2>
        <p className="section-hint">{t('app.invest.hint')}</p>
        <Disclaimer />
      </div>

      <div className="inv-nav" role="tablist" aria-label={t('app.invest.nav')}>
        {SECTIONS.map((id, i) => (
          <button
            key={id}
            id={`inv-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={section === id}
            aria-controls={`inv-panel-${id}`}
            tabIndex={section === id ? 0 : -1}
            className={`inv-tab${section === id ? ' inv-tab--on' : ''}`}
            onClick={() => setSection(id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span aria-hidden="true">{ICONS[id]}</span> {t(`app.invest.section.${id}`)}
          </button>
        ))}
      </div>

      <div
        className="card inv-panel"
        role="tabpanel"
        id={`inv-panel-${section}`}
        aria-labelledby={`inv-tab-${section}`}
      >
        <p className="inv-varies" role="note">
          ℹ️ {t('app.invest.varies')}
        </p>
        {section === 'map' && <AssetMap />}
        {section === 'learn' && <Learn />}
        {section === 'markets' && (
          <>
            <p className="inv-lead">{t('app.invest.markets.lead')}</p>
            <MarketsPanel />
          </>
        )}
        {section === 'charts' && (
          <div className="inv-stack">
            <p className="inv-lead">{t('app.invest.charts.lead')}</p>
            {CHART_IDS.map((id) => (
              <InvestChart key={id} id={id} />
            ))}
          </div>
        )}
        {section === 'calcs' && (
          <div className="inv-stack">
            <p className="inv-lead">{t('app.invest.calcs.lead')}</p>
            {CALC_IDS.map((id) => (
              <InvestCalc key={id} id={id} />
            ))}
          </div>
        )}
      </div>
      <p className="inv-note inv-footer">{t('app.invest.disclaimer.short')}</p>
    </div>
  );
}
