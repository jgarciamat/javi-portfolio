import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GUIDE_NOTICE, inlineParts, longDate, type Guide } from '../domain/guides';
import { categoryOf, readingMinutes } from '../domain/guideCategories';

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

/** The text of a guide: introduction and sections. */
export function GuideBody({
  guide,
  renderLink,
}: {
  guide: Guide;
  /** How an internal link of the text is shown; by default a link to that address. */
  renderLink?: (to: string, label: string) => ReactNode;
}) {
  return (
    <div style={{ ['--cat' as string]: categoryOf(guide.slug).color }}>
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
      {guide.sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          {s.paragraphs.map((p) => (
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
      ))}
      {guide.sources && guide.checked && (
        <section className="guide-sources">
          <h2>Fuentes oficiales</h2>
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
