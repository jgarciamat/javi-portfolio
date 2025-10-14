import React, { useEffect, useState } from 'react';
import styles from './NewsContainer.module.scss';
import type { NewsItem } from '../../domain/news';
import { fetchNews } from '../../application/fetchNews';
import { News } from '../components/News';

export const NewsContainer: React.FC = () => {
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
    <div className={styles.newsContainer}>
      <h2 className={styles.containerTitle}>Noticias Relevantes</h2>
      {loading && <p className={styles.loading}>Cargando noticias...</p>}
      {error && <p className={styles.error}>Error: {error}</p>}
      <div className={styles.newsList}>
        {news.map((item, idx) => (
          <News
            key={idx}
            title={item.title}
            description={item.summary}
            url={item.url}
          />
        ))}
      </div>
    </div>
  );
};
