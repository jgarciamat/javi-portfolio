import type { Guide } from '../domain/guides';

/** The text of a guide: introduction and sections. */
export function GuideBody({ guide }: { guide: Guide }) {
  return (
    <>
      <p className="guide-intro">{guide.intro}</p>
      {guide.sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}
    </>
  );
}
