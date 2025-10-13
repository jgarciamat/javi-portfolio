

import React, { useEffect, useState } from 'react';
import './ExampleComponent.scss';
import type { NewsItem } from '../../domain/news';
import { fetchNews } from '../../application/fetchNews';

export const ExampleComponent: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNews()
      .then(setNews)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="example-component">
      <h2>Noticias relevantes</h2>
      {loading && <p>Cargando noticias...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <ul>
        {news.map((item, idx) => (
          <li key={idx}>
            <a href={item.url} target="_blank" rel="noopener noreferrer"><strong>{item.title}</strong></a>
            <div>{item.summary}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};
