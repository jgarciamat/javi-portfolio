import { describe, it, expect } from '@jest/globals';
import { filterNews, type NewsItem } from '../news';

describe('filterNews', () => {
    const testNews: NewsItem[] = [
        {
            title: 'Test Article About React',
            url: 'https://test.com/react',
            summary: 'Article about React'
        },
        {
            title: 'TypeScript Best Practices',
            url: 'https://test.com/typescript',
            summary: 'Best practices for TS'
        },
        {
            title: 'React Testing Guide',
            url: 'https://test.com/testing',
            summary: 'Guide for testing React apps'
        }
    ];

    it('debe retornar todas las noticias cuando no hay filtro de título', () => {
        const result = filterNews(testNews, {});
        expect(result).toEqual(testNews);
    });

    it('debe filtrar noticias que contienen el texto en el título', () => {
        const result = filterNews(testNews, { titleContains: 'React' });
        expect(result).toHaveLength(2);
        expect(result.every(news =>
            news.title.toLowerCase().includes('react')
        )).toBe(true);
    });

    it('debe ser case-insensitive al filtrar', () => {
        const result = filterNews(testNews, { titleContains: 'react' });
        expect(result).toHaveLength(2);
    });

    it('debe retornar array vacío cuando no hay coincidencias', () => {
        const result = filterNews(testNews, { titleContains: 'Python' });
        expect(result).toHaveLength(0);
    });
});