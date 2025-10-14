import React from 'react';
import styles from './News.module.scss';

export interface NewsProps {
  title: string;
  description: string;
  url?: string;
}

export const News: React.FC<NewsProps> = ({ title, description, url }) => {
  return (
    <div className={styles.news}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className={styles.link}>
          Leer más
        </a>
      )}
    </div>
  );
};
