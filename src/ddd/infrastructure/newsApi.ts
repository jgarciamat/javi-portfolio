import type { NewsItem } from '../domain/news';

export async function fetchNewsFromApi(): Promise<NewsItem[]> {
  const res = await fetch('http://localhost:8000/news');
  if (!res.ok) throw new Error('Error al obtener noticias');
  return res.json();
}
