import { useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { useHeaderOffset } from '@shared/hooks/useHeaderOffset';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { AssetMap } from './AssetMap';
import { Learn } from './Learn';
import '../../finances/ui/css/Sections.css';
import './css/Invest.css';

const SECTIONS = ['map', 'learn'] as const;
type SectionId = (typeof SECTIONS)[number];

const ICONS: Record<SectionId, string> = {
  map: '🗺️',
  learn: '📚',
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

/**
 * "Learn to invest": the first two chapters are free, the rest are Premium. Their text is not in
 * the app: Premium users get it from the API, free accounts get the way to upgrade instead
 * (whichever way they got to the chapter, a link in the map included). Outside the plan provider
 * (tests, public pages) nothing is locked, like PremiumOnly.
 */
function LearnGate({
  openId,
  onOpen,
}: {
  openId: string | null;
  onOpen: (id: string | null) => void;
}) {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  if (plan && plan.loading && !plan.overview) {
    return (
      <p className="inv-empty" role="status">
        {t('app.common.loading')}
      </p>
    );
  }
  return (
    <Learn
      openId={openId}
      onOpen={onOpen}
      premium={!plan || plan.isPremium}
      onUpgrade={() => plan!.openUpgrade({ kind: 'feature', feature: 'investCourse' })}
    />
  );
}

/** The "Invest" tab: asset map, educational chapters, market hours; charts and calculators live inside the chapters. */
export function InvestView() {
  const { t } = useI18n();
  const [section, setSection] = useState<SectionId>('map');
  const [chapter, setChapter] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  // The section menu stays under the header of the app.
  useHeaderOffset(root, '--inv-top');

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
        {section === 'map' && (
          <AssetMap
            onOpenChapter={(id) => {
              setChapter(id);
              setSection('learn');
            }}
          />
        )}
        {section === 'learn' && <LearnGate openId={chapter} onOpen={setChapter} />}
      </div>
      <p className="inv-note inv-footer">{t('app.invest.disclaimer.short')}</p>
    </div>
  );
}
