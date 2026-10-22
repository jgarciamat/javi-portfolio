import { useEffect, useId, useState, type ReactElement } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Modal } from '@shared/components/Modal';
import { intlTag } from '../domain/format';
import { FIB_RATIOS } from '../domain/indicators';
import {
  CANDLE_PATTERNS,
  CHART_PATTERNS,
  GLOSSARY_TERMS,
  GUIDE_PARAGRAPHS,
  GUIDE_SECTIONS,
  type GuideSection,
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
import './css/GuideModal.css';

const anchor = (section: GuideSection) => `cc-guide-${section}`;
/** Some browsers return a promise from scrollIntoView: never hand it to React. */
const jump = (section: GuideSection): void => {
  void document.getElementById(anchor(section))?.scrollIntoView?.({ block: 'start' });
};

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
      <h3 id={`${anchor(id)}-title`}>{t(`app.crypto.guide.${id}.title`)}</h3>
      <div className="cc-guide-art">{art}</div>
      {paragraphs.map((n) => (
        <p key={n}>{t(`app.crypto.guide.${id}.p${n}`)}</p>
      ))}
      {extra}
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
          <h5>{t(`app.crypto.guide.patterns.${id}.title`)}</h5>
          <p>{t(`app.crypto.guide.patterns.${id}.text`)}</p>
        </div>
      </li>
    );
  };
  return (
    <section
      id={anchor('patterns')}
      className="cc-guide-section"
      aria-labelledby={`${anchor('patterns')}-title`}
    >
      <h3 id={`${anchor('patterns')}-title`}>{t('app.crypto.guide.patterns.title')}</h3>
      <p>{t('app.crypto.guide.patterns.intro')}</p>
      <p className="cc-guide-caution">{t('app.crypto.guide.patterns.caution')}</p>
      <h4>{t('app.crypto.guide.patterns.candlesTitle')}</h4>
      <ul className="cc-patterns">{CANDLE_PATTERNS.map(item)}</ul>
      <h4>{t('app.crypto.guide.patterns.chartTitle')}</h4>
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
    <section id={id} className="cc-guide-section" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>{t('app.crypto.guide.glossary.title')}</h3>
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

/**
 * «What is each thing?»: how to read candles, sizes and every layer of the chart, and the best
 * known patterns, with small drawings, and every word of the console at the end. Plain
 * explanations for learning, never advice.
 */
export function GuideModal({
  section,
  premium = false,
  onClose,
}: {
  section: GuideSection;
  /** Whether the person has Premium (for the «Free and Premium» section). */
  premium?: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  useEffect(() => {
    // The first section is already at the top, under the note.
    if (section !== GUIDE_SECTIONS[0]) jump(section);
  }, [section]);
  const percent = (ratio: number) =>
    `${new Intl.NumberFormat(intlTag(locale), {
      maximumFractionDigits: 1,
    }).format(ratio * 100)} %`;
  const chart = (key: string) => t(`app.crypto.chart.${key}`);
  const layer = (key: string) => t(`app.crypto.layers.${key}`);
  const art = (key: string) => t(`app.crypto.guide.art.${key}`);

  return (
    <Modal
      label={t('app.crypto.guide.title')}
      onClose={onClose}
      overlayClassName="cc-guide-overlay"
      className="cc-guide"
    >
      <header className="cc-guide-head">
        <h2>{t('app.crypto.guide.title')}</h2>
        <button type="button" className="cc-guide-close" onClick={onClose}>
          {t('app.crypto.guide.close')}
        </button>
      </header>
      <nav className="cc-guide-nav" aria-label={t('app.crypto.guide.index')}>
        {GUIDE_SECTIONS.map((id) => (
          <button key={id} type="button" className="cc-chip" onClick={() => jump(id)}>
            {t(`app.crypto.guide.${id}.title`)}
          </button>
        ))}
      </nav>
      <div className="cc-guide-body">
        <p className="cc-guide-note">{t('app.crypto.guide.note')}</p>
        <Section
          id="candles"
          art={<CandleArt labels={[chart('high'), chart('close'), chart('open'), chart('low')]} />}
          extra={<VolumeArt />}
        />
        <Section id="intervals" art={<IntervalsArt />} />
        <Section
          id="directions"
          art={<BullsBearsArt labels={[art('bulls'), art('bears')]} />}
          extra={<LongShortArt labels={['Long', 'Short']} />}
        />
        <Section
          id="orders"
          art={<OrdersArt labels={[art('market'), art('limit'), art('stop')]} />}
        />
        <Section id="exits" art={<ExitsArt labels={[art('entry'), 'TP', 'SL']} />} />
        <Section id="leverage" art={<LeverageArt labels={['1x', '10x']} />} />
        <Section id="ema" art={<EmaArt />} />
        <Section id="bollinger" art={<BollingerArt />} />
        <Section id="vwap" art={<VwapArt />} />
        <Section id="profile" art={<ProfileArt labels={['VAH', 'POC', 'VAL']} />} />
        <Section id="levels" art={<LevelsArt labels={[layer('resistance'), layer('support')]} />} />
        <Section id="fibonacci" art={<FibonacciArt labels={FIB_RATIOS.map(percent)} />} />
        <Patterns />
        <Glossary />
        <div id={anchor('plans')} className="cc-guide-section">
          <PlansCard premium={premium} headingLevel={3} />
        </div>
      </div>
    </Modal>
  );
}
