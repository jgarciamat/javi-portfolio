import type { NewsItem } from '../domain/news';
import { fetchNewsFromApi } from '../infrastructure/newsApi';

export async function fetchNews(): Promise<NewsItem[]> {
    return fetchNewsFromApi();
}
