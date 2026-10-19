import { useEffect, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useResource } from '@shared/hooks/useResource';
import {
  CHAPTERS,
  TOPICS,
  allGlossaryTerms,
  findChapter,
  freeContent,
  matchesQuery,
} from '../domain/content';
import type { ChapterInfo, ChapterTopic } from '../domain/types';
import { ChapterBody } from './ChapterBody';
import { ChapterVideos } from './ChapterVideos';
import { LearnLocked } from './LearnLocked';

const LEVEL_KEY = { 1: 'starter', 2: 'medium', 3: 'advanced' } as const;

function Glossary({ onOpen, premium }: { onOpen: (id: string) => void; premium: boolean }) {
  const { t } = useI18n();
  const { learnApi } = useApi();
  const [query, setQuery] = useState('');
  // Premium users also get the terms of the Premium chapters (a failure leaves the free ones).
  const { data: more } = useResource(() => learnApi.glossary(), [learnApi], {
    enabled: premium,
  });
  const terms = allGlossaryTerms(more).filter((g) => matchesQuery(`${g.term} ${g.def}`, query));
  return (
    <section className="inv-block" aria-label={t('app.invest.learn.glossary')}>
      <h3>📖 {t('app.invest.learn.glossary')}</h3>
      <input
        type="search"
        className="tx-input inv-search"
        placeholder={t('app.invest.learn.glossarySearch')}
        aria-label={t('app.invest.learn.glossarySearch')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {terms.length === 0 && <p className="inv-empty">{t('app.invest.learn.glossaryEmpty')}</p>}
      <dl className="inv-glossary-all">
        {terms.map((g) => (
          <div key={g.term}>
            <dt>{g.term}</dt>
            <dd>
              {g.def}{' '}
              <button type="button" className="inv-link" onClick={() => onOpen(g.chapterId)}>
                {t('app.invest.learn.seeChapter')}
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The text of a Premium chapter, asked to the API (it is not part of the app). */
function PremiumChapterBody({ id }: { id: string }) {
  const { t } = useI18n();
  const { learnApi } = useApi();
  const { data, error } = useResource(() => learnApi.chapter(id), [learnApi, id]);
  if (error) return <p className="form-error">{t('app.invest.learn.loadError')}</p>;
  if (!data) {
    return (
      <p className="inv-empty" role="status">
        {t('app.common.loading')}
      </p>
    );
  }
  return <ChapterBody chapter={data} />;
}

/** A chapter's text: free ones ship with the app, Premium ones come from the API. */
function ChapterText({
  chapter,
  premium,
  onUpgrade,
}: {
  chapter: ChapterInfo;
  premium: boolean;
  onUpgrade: () => void;
}) {
  if (!chapter.premium) return <ChapterBody chapter={freeContent(chapter.id)!} />;
  if (!premium) return <LearnLocked onUpgrade={onUpgrade} />;
  return <PremiumChapterBody id={chapter.id} />;
}

/**
 * Educational chapters: a catalogue with search and topics, and a reader for each chapter.
 * The first two are free; the rest need `premium` (a free account gets `onUpgrade` instead).
 */
export function Learn({
  openId,
  onOpen,
  premium,
  onUpgrade,
}: {
  openId: string | null;
  onOpen: (id: string | null) => void;
  premium: boolean;
  onUpgrade: () => void;
}) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<ChapterTopic | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const en = locale === 'en';
  const title = (c: ChapterInfo) => (en ? c.titleEn : c.title);
  const summary = (c: ChapterInfo) => (en ? c.summaryEn : c.summary);
  const locked = (c: ChapterInfo) => c.premium && !premium;

  useEffect(() => {
    (top.current as HTMLDivElement).scrollIntoView({ block: 'start' });
  }, [openId]);

  const chapter = openId ? findChapter(openId) : undefined;
  const index = chapter ? CHAPTERS.indexOf(chapter) : -1;

  if (chapter) {
    const topicInfo = TOPICS.find((x) => x.id === chapter.topic) as (typeof TOPICS)[number];
    const prev = CHAPTERS[index - 1];
    const next = CHAPTERS[index + 1];
    return (
      <article className="inv-article" style={{ ['--cat' as string]: chapter.color }}>
        <div ref={top} />
        <button type="button" className="back-btn" onClick={() => onOpen(null)}>
          ← {t('app.invest.learn.back')}
        </button>
        <p className="inv-kicker">
          <span className="inv-kicker-tag">
            {topicInfo.emoji} {en ? topicInfo.labelEn : topicInfo.label}
          </span>
          <span>⏱ {t('app.invest.learn.minutes', { min: chapter.minutes })}</span>
          <span>{t(`app.invest.level.${LEVEL_KEY[chapter.level]}`)}</span>
        </p>
        <h2 className="inv-article-title">
          <span aria-hidden="true">{chapter.emoji}</span> {title(chapter)}
        </h2>
        {en && <p className="inv-note">{t('app.invest.learn.spanishOnly')}</p>}
        <ChapterText chapter={chapter} premium={premium} onUpgrade={onUpgrade} />
        <ChapterVideos numbers={chapter.videos} />
        <nav className="inv-pager" aria-label={t('app.invest.learn.pager')}>
          {prev ? (
            <button type="button" className="btn-secondary" onClick={() => onOpen(prev.id)}>
              ← {title(prev)}
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button type="button" className="btn-secondary" onClick={() => onOpen(next.id)}>
              {title(next)} →
            </button>
          )}
        </nav>
      </article>
    );
  }

  const shown = CHAPTERS.filter(
    (c) =>
      (topic === null || c.topic === topic) &&
      matchesQuery(`${c.title} ${c.titleEn} ${c.summary} ${c.summaryEn}`, query)
  );

  return (
    <div className="inv-learn">
      <div ref={top} />
      <p className="inv-lead">{t('app.invest.learn.lead', { total: CHAPTERS.length })}</p>
      <input
        type="search"
        className="tx-input inv-search"
        placeholder={t('app.invest.learn.search')}
        aria-label={t('app.invest.learn.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="inv-filters" role="group" aria-label={t('app.invest.learn.topics')}>
        <button
          type="button"
          className={`inv-pill${topic === null ? ' inv-pill--on' : ''}`}
          aria-pressed={topic === null}
          onClick={() => setTopic(null)}
        >
          {t('app.invest.filter.all')}
        </button>
        {TOPICS.map((x) => (
          <button
            key={x.id}
            type="button"
            className={`inv-pill${topic === x.id ? ' inv-pill--on' : ''}`}
            aria-pressed={topic === x.id}
            onClick={() => setTopic(topic === x.id ? null : x.id)}
          >
            {x.emoji} {en ? x.labelEn : x.label}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="inv-empty">{t('app.invest.learn.empty')}</p>}
      <ul className="inv-chapters">
        {shown.map((c) => (
          <li
            key={c.id}
            className={`inv-chapter${c.topic === 'stocks' ? ' inv-chapter--featured' : ''}`}
            style={{ ['--cat' as string]: c.color }}
          >
            <span className="inv-chapter-emoji" aria-hidden="true">
              {c.emoji}
            </span>
            <button type="button" className="inv-chapter-title" onClick={() => onOpen(c.id)}>
              {title(c)}
            </button>
            <p>{summary(c)}</p>
            <div className="inv-chapter-meta">
              <span>⏱ {t('app.invest.learn.minutes', { min: c.minutes })}</span>
              <span className="inv-chapter-tag">{t(`app.invest.level.${LEVEL_KEY[c.level]}`)}</span>
              {c.withCalc && (
                <span className="inv-chapter-tag">🧮 {t('app.invest.learn.withCalc')}</span>
              )}
              {locked(c) && <span className="premium-chip">Premium</span>}
            </div>
          </li>
        ))}
      </ul>
      <Glossary onOpen={onOpen} premium={premium} />
    </div>
  );
}
