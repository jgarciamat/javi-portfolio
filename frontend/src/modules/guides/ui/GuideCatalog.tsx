import { useState, type ReactNode } from 'react';
import { GUIDES, type Guide } from '../domain/guides';
import { GUIDE_CATEGORIES, categoryOf, readingMinutes } from '../domain/guideCategories';
import './css/Guides.css';

const matches = (g: Guide, query: string) =>
  `${g.title} ${g.description}`.toLowerCase().includes(query.trim().toLowerCase());

/** The guides grouped by topic, with a search box and one coloured card for each guide. */
export function GuideCatalog({
  renderLink,
}: {
  renderLink: (guide: Guide, className: string, children: ReactNode) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [only, setOnly] = useState<string | null>(null);
  const shown = GUIDES.filter((g) => matches(g, query));
  const groups = GUIDE_CATEGORIES.map((c) => ({
    category: c,
    guides: shown.filter((g) => categoryOf(g.slug).id === c.id),
  })).filter((g) => g.guides.length > 0 && (only === null || only === g.category.id));

  return (
    <div className="guide-catalog">
      <input
        type="search"
        className="tx-input guide-search"
        placeholder="Buscar una guía…"
        aria-label="Buscar una guía"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="guide-chips" role="group" aria-label="Temas">
        <button
          type="button"
          className={`guide-chip${only === null ? ' guide-chip-on' : ''}`}
          aria-pressed={only === null}
          onClick={() => setOnly(null)}
        >
          Todas
        </button>
        {GUIDE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`guide-chip${only === c.id ? ' guide-chip-on' : ''}`}
            style={{ ['--cat' as string]: c.color }}
            aria-pressed={only === c.id}
            onClick={() => setOnly(only === c.id ? null : c.id)}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
      {groups.length === 0 && <p className="guide-empty">No hay guías con esa búsqueda.</p>}
      {groups.map(({ category, guides }) => (
        <section
          key={category.id}
          className="guide-group"
          style={{ ['--cat' as string]: category.color }}
        >
          <header className="guide-group-head">
            <span className="guide-group-emoji" aria-hidden="true">
              {category.emoji}
            </span>
            <div>
              <h2>{category.label}</h2>
              <p>{category.blurb}</p>
            </div>
          </header>
          <ul className="guide-cards">
            {guides.map((g) => (
              <li key={g.slug} className="guide-card">
                {renderLink(g, 'guide-card-title', g.title)}
                <p>{g.description}</p>
                <div className="guide-card-meta">
                  <span>⏱ {readingMinutes(g)} min</span>
                  {g.tool && <span className="guide-card-tag">🧮 Con calculadora</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
