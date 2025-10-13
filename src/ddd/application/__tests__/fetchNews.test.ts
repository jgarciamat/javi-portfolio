import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { fetchNews } from '../fetchNews';
import * as newsApi from '../../infrastructure/newsApi';
import type { NewsItem } from '../../domain/news';

jest.mock('../../infrastructure/newsApi');

describe('fetchNews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('debe retornar noticias desde la infraestructura', async () => {
    // Arrange
    const mockNews: NewsItem[] = [
      {
        title: 'Test Article',
        url: 'https://test.com/article',
        summary: 'This is a test article summary'
      }
    ];
    const fetchNewsFromApiSpy = jest.spyOn(newsApi, 'fetchNewsFromApi')
      .mockResolvedValueOnce(mockNews);

    // Act
    const result = await fetchNews();

    // Assert
    expect(result).toEqual(mockNews);
    expect(fetchNewsFromApiSpy).toHaveBeenCalledTimes(1);
    expect(fetchNewsFromApiSpy).toHaveBeenCalledWith();
  });

  it('debe propagar errores de la infraestructura', async () => {
    // Arrange
    const expectedError = new Error('Error fetching news');
    jest.spyOn(newsApi, 'fetchNewsFromApi')
      .mockRejectedValueOnce(expectedError);

    // Act & Assert
    await expect(fetchNews()).rejects.toThrow(expectedError);
  });
});
