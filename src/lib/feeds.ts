import Parser from 'rss-parser';
import type { FeedItem } from './types';

const rssParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'MediaCheck/1.0',
  },
});

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NY Times' },
  { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters' },
  { url: 'https://www.theguardian.com/world/rss', name: 'The Guardian' },
  { url: 'https://elpais.com/rss/elpais/portada.xml', name: 'El Pais' },
];

export async function fetchRSSFeeds(limit = 20): Promise<FeedItem[]> {
  const results: FeedItem[] = [];

  const feedPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      return (parsed.items || []).slice(0, 5).map((item) => ({
        title: item.title || '',
        link: item.link || '',
        content: item.contentSnippet || item.content || '',
        pubDate: item.pubDate || new Date().toISOString(),
        source: feed.name,
        sourceType: 'rss' as const,
      }));
    } catch {
      console.error(`Failed to fetch RSS feed: ${feed.name}`);
      return [];
    }
  });

  const allFeeds = await Promise.allSettled(feedPromises);
  for (const result of allFeeds) {
    if (result.status === 'fulfilled') {
      results.push(...result.value);
    }
  }

  return results
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, limit);
}

export async function fetchNewsAPI(query: string, limit = 10): Promise<FeedItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      sortBy: 'relevancy',
      pageSize: String(limit),
      language: 'es,en',
      apiKey,
    });

    const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.articles || []).map((article: any) => ({
      title: article.title || '',
      link: article.url || '',
      content: article.description || '',
      pubDate: article.publishedAt || new Date().toISOString(),
      source: article.source?.name || 'NewsAPI',
      sourceType: 'newsapi' as const,
    }));
  } catch {
    console.error('Failed to fetch from NewsAPI');
    return [];
  }
}

export async function searchSources(query: string): Promise<{ title: string; url: string; content: string }[]> {
  const [rssItems, newsItems] = await Promise.all([
    fetchRSSFeeds(10),
    fetchNewsAPI(query, 10),
  ]);

  const allItems = [...rssItems, ...newsItems];

  // Filter items relevant to the query
  const queryWords = query.toLowerCase().split(/\s+/);
  const relevant = allItems.filter((item) => {
    const text = `${item.title} ${item.content}`.toLowerCase();
    return queryWords.some((word) => word.length > 3 && text.includes(word));
  });

  return relevant.slice(0, 8).map((item) => ({
    title: item.title,
    url: item.link,
    content: item.content,
  }));
}
