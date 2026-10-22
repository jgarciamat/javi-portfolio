import { useId, useState, type KeyboardEvent, type ReactElement } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { intlTag } from '../domain/format';
import { FIB_RATIOS } from '../domain/indicators';
import {
  CANDLE_PATTERNS,
  CHART_PATTERNS,
  GLOSSARY_TERMS,
  GUIDE_PARAGRAPHS,
  GUIDE_TABS,
  type GuideSection,
  type GuideTab,
  type ParagraphSection,
} from '../domain/guide';
import {
  BollingerArt,
  BullsBearsArt,
  CandleArt,
  EmaArt,
  ExitsArt,
  FibonacciArt,
  IntervalsArt,
  LeverageArt,
  LevelsArt,
  LongShortArt,
  OrdersArt,
  PATTERN_ART,
  ProfileArt,
  VolumeArt,
  VwapArt,
} from './guideArt';
import { PlansCard } from './PremiumPanel';
import './css/GuidePanel.css';

/** One small line icon per tab (16 × 16), drawn with the text colour. */
const TAB_ICONS: Record<GuideTab, string> = {
  candles: 'M4 2v12M2.5 5h3v6h-3zM11 3v10M9.5 6h3v4h-3z',
  ema: 'M1.5 12c3-1 4-6 7-6s3.5 3 6-1',
  bands: 'M1.5 5c3-2 9-2 13 0M1.5 11c3 2 9 2 13 0M1.5 8h13',
  levels: 'M1.5 4h13M1.5 8h9M1.5 12h13',
  patterns: 'M1.5 12 5 5l3 4 3-6 3.5 9',
  directions: 'M4 13V4M1.5 6.5 4 4l2.5 2.5M12 3v9M9.5 9.5 12 12l2.5-2.5',
  orders: 'M3 2.5h7l3 3v8H3zM5.5 7h5M5.5 10h5',
  leverage: 'M1.5 13h13M8 13 3 6M8 13l5-7M2 6h2M12 6h2',
  glossary:
    'M8 4.2C6.6 3 4.6 2.6 2 2.8v9.6c2.6-.2 4.6.2 6 1.4 1.4-1.2 3.4-1.6 6-1.4V2.8c-2.6-.2-4.6.2-6 1.4Zm0 0v9.6',
  plans: 'M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z',
};

function TabIcon({ tab }: { tab: GuideTab }) {
  return (
    <svg className="cc-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={TAB_ICONS[tab]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const anchor = (section: GuideSection) => `cc-guide-${section}`;

/** A card with its drawings at the side and the paragraphs of the section. */
function Section({
  id,
  art,
  extra,
}: {
  id: ParagraphSection;
  art: ReactElement;
  extra?: ReactElement;
}) {
  const { t } = useI18n();
  const paragraphs = Array.from({ length: GUIDE_PARAGRAPHS[id] }, (_, i) => i + 1);
  return (
    <section id={anchor(id)} className="cc-guide-section" aria-labelledby={`${anchor(id)}-title`}>
      <div className="cc-guide-art">
        {art}
        {extra}
      </div>
      <div className="cc-guide-text">
        <h4 id={`${anchor(id)}-title`}>{t(`app.crypto.guide.${id}.title`)}</h4>
        {paragraphs.map((n) => (
          <p key={n}>{t(`app.crypto.guide.${id}.p${n}`)}</p>
        ))}
      </div>
    </section>
  );
}

function Patterns() {
  const { t } = useI18n();
  const item = (id: string) => {
    const Art = PATTERN_ART[id];
    return (
      <li key={id} className="cc-pattern">
        <Art />
        <div>
          <h6>{t(`app.crypto.guide.patterns.${id}.title`)}</h6>
          <p>{t(`app.crypto.guide.patterns.${id}.text`)}</p>
        </div>
      </li>
    );
  };
  return (
    <section
      id={anchor('patterns')}
      className="cc-guide-section cc-guide-section--wide"
      aria-labelledby={`${anchor('patterns')}-title`}
    >
      <h4 id={`${anchor('patterns')}-title`}>{t('app.crypto.guide.patterns.title')}</h4>
      <p>{t('app.crypto.guide.patterns.intro')}</p>
      <p className="cc-guide-caution">{t('app.crypto.guide.patterns.caution')}</p>
      <h5>{t('app.crypto.guide.patterns.candlesTitle')}</h5>
      <ul className="cc-patterns">{CANDLE_PATTERNS.map(item)}</ul>
      <h5>{t('app.crypto.guide.patterns.chartTitle')}</h5>
      <ul className="cc-patterns">{CHART_PATTERNS.map(item)}</ul>
      <p className="cc-guide-caution">{t('app.crypto.guide.patterns.caution')}</p>
    </section>
  );
}

/** Text compared without capitals or accents, so «stop» finds «Stop loss» and «vela» finds «Vela». */
const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** «Words of the console»: every term with its short explanation, and a box to find one. */
function Glossary() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const searchId = useId();
  const id = anchor('glossary');
  const terms = GLOSSARY_TERMS.map((term) => ({
    term,
    name: t(`app.crypto.glossary.${term}.term`),
    text: t(`app.crypto.glossary.${term}.text`),
  }));
  const wanted = plain(query.trim());
  const shown = terms.filter((g) => plain(`${g.name} ${g.text}`).includes(wanted));
  return (
    <section
      id={id}
      className="cc-guide-section cc-guide-section--wide"
      aria-labelledby={`${id}-title`}
    >
      <h4 id={`${id}-title`}>{t('app.crypto.guide.glossary.title')}</h4>
      <p>{t('app.crypto.guide.glossary.intro')}</p>
      <label className="cc-glossary-search" htmlFor={searchId}>
        <span>{t('app.crypto.guide.glossary.search')}</span>
        <input
          id={searchId}
          type="search"
          value={query}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {shown.length ? (
        <dl className="cc-glossary">
          {shown.map((g) => (
            <div key={g.term}>
              <dt>{g.name}</dt>
              <dd>{g.text}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p role="status">{t('app.crypto.guide.glossary.none', { query: query.trim() })}</p>
      )}
    </section>
  );
}

/** The sections of one tab, one under the other. */
function TabContent({ tab, premium }: { tab: GuideTab; premium: boolean }) {
  const { t, locale } = useI18n();
  const percent = (ratio: number) =>
    `${new Intl.NumberFormat(intlTag(locale), {
      maximumFractionDigits: 1,
    }).format(ratio * 100)} %`;
  const chart = (key: string) => t(`app.crypto.chart.${key}`);
  const layer = (key: string) => t(`app.crypto.layers.${key}`);
  const art = (key: string) => t(`app.crypto.guide.art.${key}`);
  const sections: Record<GuideSection, () => ReactElement> = {
    candles: () => (
      <Section
        id="candles"
        art={<CandleArt labels={[chart('high'), chart('close'), chart('open'), chart('low')]} />}
        extra={<VolumeArt />}
      />
    ),
    intervals: () => <Section id="intervals" art={<IntervalsArt />} />,
    directions: () => (
      <Section
        id="directions"
        art={<BullsBearsArt labels={[art('bulls'), art('bears')]} />}
        extra={<LongShortArt labels={['Long', 'Short']} />}
      />
    ),
    orders: () => (
      <Section
        id="orders"
        art={<OrdersArt labels={[art('market'), art('limit'), art('stop')]} />}
      />
    ),
    exits: () => <Section id="exits" art={<ExitsArt labels={[art('entry'), 'TP', 'SL']} />} />,
    leverage: () => <Section id="leverage" art={<LeverageArt labels={['1x', '10x']} />} />,
    ema: () => <Section id="ema" art={<EmaArt />} />,
    bollinger: () => <Section id="bollinger" art={<BollingerArt />} />,
    vwap: () => <Section id="vwap" art={<VwapArt />} />,
    profile: () => <Section id="profile" art={<ProfileArt labels={['VAH', 'POC', 'VAL']} />} />,
    levels: () => (
      <Section id="levels" art={<LevelsArt labels={[layer('resistance'), layer('support')]} />} />
    ),
    fibonacci: () => (
      <Section id="fibonacci" art={<FibonacciArt labels={FIB_RATIOS.map(percent)} />} />
    ),
    patterns: () => <Patterns />,
    glossary: () => <Glossary />,
    plans: () => (
      <div id={anchor('plans')} className="cc-guide-section cc-guide-section--wide">
        <PlansCard premium={premium} headingLevel={3} />
      </div>
    ),
  };
  const shown: readonly GuideSection[] = GUIDE_TABS.find((g) => g.id === tab)!.sections;
  return (
    <>
      {shown.map((section) => (
        <div key={section}>{sections[section]()}</div>
      ))}
    </>
  );
}

/**
 * The tabs of «Learn before playing» and the one on screen: how to read candles, sizes and every
 * layer of the chart, the best known patterns, the orders and every word of the console, with
 * large drawings. Plain explanations for learning, never advice. Arrows, Home and End move
 * between the tabs.
 */
export function GuidePanel({
  tab,
  premium = false,
  onTab,
}: {
  tab: GuideTab;
  /** Whether the person has Premium (for the «Free and Premium» tab). */
  premium?: boolean;
  onTab: (tab: GuideTab) => void;
}) {
  const { t } = useI18n();
  const base = useId();
  const tabId = (id: GuideTab) => `${base}-tab-${id}`;
  const panelId = `${base}-panel`;

  const choose = (id: GuideTab, focus: boolean) => {
    onTab(id);
    const button = document.getElementById(tabId(id))!;
    if (focus) button.focus();
    // Some browsers return a promise from scrollIntoView: never hand it to React.
    void button.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = GUIDE_TABS.findIndex((g) => g.id === tab);
    const last = GUIDE_TABS.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    choose(GUIDE_TABS[moves[event.key]].id, true);
  };

  return (
    <>
      <div
        className="cc-guide-tabs"
        role="tablist"
        aria-label={t('app.crypto.guide.index')}
        onKeyDown={onKeyDown}
      >
        {GUIDE_TABS.map(({ id }) => (
          <button
            key={id}
            id={tabId(id)}
            type="button"
            role="tab"
            className="cc-guide-tab"
            aria-selected={id === tab}
            aria-controls={panelId}
            tabIndex={id === tab ? 0 : -1}
            onClick={() => choose(id, false)}
          >
            <TabIcon tab={id} />
            {t(`app.crypto.guide.tabs.${id}`)}
          </button>
        ))}
      </div>
      <div
        key={tab}
        id={panelId}
        className="cc-guide-body"
        role="tabpanel"
        aria-labelledby={tabId(tab)}
        tabIndex={0}
      >
        <TabContent tab={tab} premium={premium} />
      </div>
    </>
  );
}
