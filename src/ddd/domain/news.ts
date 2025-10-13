export type NewsItem = {
    title: string;
    url: string;
    summary: string;
};

export interface NewsFilter {
    titleContains?: string;
}

export function filterNews(news: NewsItem[], filter: NewsFilter): NewsItem[] {
    if (!filter.titleContains) return news;

    const searchTerm = filter.titleContains.toLowerCase();
    return news.filter(item =>
        item.title.toLowerCase().includes(searchTerm)
    );
}
