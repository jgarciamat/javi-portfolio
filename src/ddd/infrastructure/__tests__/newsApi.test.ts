import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { fetchNewsFromApi } from '../newsApi';
import type { NewsItem } from '../../domain/news';

// Mock fetch global
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
globalThis.fetch = mockFetch;

const API_URL = 'http://localhost:8000/news';

describe('newsApi', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    describe('cuando la petición es exitosa', () => {
        it('debe obtener noticias desde la API correctamente', async () => {
            // Arrange
            const mockNews: NewsItem[] = [
                {
                    title: 'Test Article 1',
                    url: 'https://test.com/article1',
                    summary: 'This is test article 1 summary'
                },
                {
                    title: 'Test Article 2',
                    url: 'https://test.com/article2',
                    summary: 'This is test article 2 summary'
                }
            ];

            mockFetch.mockResolvedValueOnce(new Response(
                JSON.stringify(mockNews),
                { status: 200 }
            ));

            // Act
            const result = await fetchNewsFromApi();

            // Assert
            expect(result).toEqual(mockNews);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(API_URL);
        });

        it('debe manejar correctamente una respuesta vacía', async () => {
            // Arrange
            const emptyNews: NewsItem[] = [];
            mockFetch.mockResolvedValueOnce(new Response(
                JSON.stringify(emptyNews),
                { status: 200 }
            ));

            // Act
            const result = await fetchNewsFromApi();

            // Assert
            expect(result).toEqual([]);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(API_URL);
        });
    });

    describe('cuando hay errores en la petición', () => {
        it.each([
            [404, 'Not Found'],
            [500, 'Internal Server Error'],
            [403, 'Forbidden'],
            [401, 'Unauthorized']
        ])('debe lanzar un error cuando la respuesta es %i (%s)', async (status, statusText) => {
            // Arrange
            mockFetch.mockResolvedValueOnce(new Response(
                statusText,
                { status, statusText }
            ));

            // Act & Assert
            await expect(fetchNewsFromApi()).rejects.toThrow('Error al obtener noticias');
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(API_URL);
        });

        it('debe lanzar un error cuando hay un problema de red', async () => {
            // Arrange
            const networkError = new Error('Network error');
            mockFetch.mockRejectedValueOnce(networkError);

            // Act & Assert
            await expect(fetchNewsFromApi()).rejects.toThrow(networkError);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(API_URL);
        });

        it('debe lanzar un error cuando la respuesta no es JSON válido', async () => {
            // Arrange
            mockFetch.mockResolvedValueOnce(new Response(
                'Invalid JSON',
                { status: 200 }
            ));

            // Act & Assert
            await expect(fetchNewsFromApi()).rejects.toThrow();
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(API_URL);
        });
    });
});