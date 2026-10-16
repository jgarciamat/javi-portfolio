import { Link } from 'react-router-dom';
import { inlineParts, type Guide } from '../domain/guides';
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
export function GuideBody({ guide }: { guide: Guide }) {
  return (
    <div style={{ ['--cat' as string]: categoryOf(guide.slug).color }}>
      <p className="guide-kicker">
        <span className="guide-kicker-tag">
          {categoryOf(guide.slug).emoji} {categoryOf(guide.slug).label}
        </span>
        <span>⏱ {readingMinutes(guide)} min de lectura</span>
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
                  <Link key={part.to + part.label} to={part.to}>
                    {part.label}
                  </Link>
                )
              )}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
