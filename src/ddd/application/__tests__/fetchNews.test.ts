import { fetchNews } from '../fetchNews';
import * as newsApi from '../../infrastructure/newsApi';
import type { NewsItem } from '../../domain/news';

describe('fetchNews', () => {
  it('debe retornar noticias desde la infraestructura', async () => {
    const mockNews: NewsItem[] = [
      { title: 'Test', url: 'https://test.com', summary: 'Resumen test' }
    ];
    jest.spyOn(newsApi, 'fetchNewsFromApi').mockResolvedValueOnce(mockNews);
    const result = await fetchNews();
    expect(result).toEqual(mockNews);
  });

  it('debe propagar errores de la infraestructura', async () => {
    jest.spyOn(newsApi, 'fetchNewsFromApi').mockRejectedValueOnce(new Error('fail'));
    await expect(fetchNews()).rejects.toThrow('fail');
  });
});
