import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  GUIDE_NOTICE,
  inlineParts,
  longDate,
  type Guide,
  type GuideSection,
} from '../domain/guides';
import { categoryOf, readingMinutes } from '../domain/guideCategories';
import { SOURCES_HEADING } from '../domain/signupWall';

const KEY = /(\d[\d.,]*\s?(?:%|€))/g;

/** Amounts and percentages stand out from the rest of the text. */
export function highlight(text: string) {
  return text.split(KEY).map((piece, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="guide-num">
        {piece}
      </strong>
    ) : (
      piece
    )
  );
}

type RenderLink = (to: string, label: string) => ReactNode;

/** Category, reading time, date and introduction of a guide. */
export function GuideHeader({ guide }: { guide: Guide }) {
  return (
    <>
      <p className="guide-kicker">
        <span className="guide-kicker-tag">
          {categoryOf(guide.slug).emoji} {categoryOf(guide.slug).label}
        </span>
        <span>⏱ {readingMinutes(guide)} min de lectura</span>
        <span>
          📅 Actualizado: <time dateTime={guide.updated}>{longDate(guide.updated)}</time>
        </span>
      </p>
      <p className="guide-intro">{highlight(guide.intro)}</p>
    </>
  );
}

/** One section: its heading and paragraphs, with the internal links of the text. */
export function GuideSectionView({
  section,
  renderLink,
}: {
  section: GuideSection;
  renderLink?: RenderLink;
}) {
  return (
    <section>
      <h2>{section.heading}</h2>
      {section.paragraphs.map((p) => (
        <p key={p}>
          {inlineParts(p).map((part) =>
            typeof part === 'string' ? (
              highlight(part)
            ) : (
              <span key={part.to + part.label}>
                {renderLink ? (
                  renderLink(part.to, part.label)
                ) : (
                  <Link to={part.to}>{part.label}</Link>
                )}
              </span>
            )
          )}
        </p>
      ))}
    </section>
  );
}

/** The text of a guide: introduction and sections. */
export function GuideBody({
  guide,
  renderLink,
}: {
  guide: Guide;
  /** How an internal link of the text is shown; by default a link to that address. */
  renderLink?: RenderLink;
}) {
  return (
    <div style={{ ['--cat' as string]: categoryOf(guide.slug).color }}>
      <GuideHeader guide={guide} />
      {guide.sections.map((s) => (
        <GuideSectionView key={s.heading} section={s} renderLink={renderLink} />
      ))}
      {guide.sources && guide.checked && (
        <section className="guide-sources">
          <h2>{SOURCES_HEADING}</h2>
          <p>Consultadas el {longDate(guide.checked)}.</p>
          <ul>
            {guide.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
          <p>{GUIDE_NOTICE}</p>
        </section>
      )}
    </div>
  );
}
