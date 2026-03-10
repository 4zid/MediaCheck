import Parser from 'rss-parser';
import type { FeedItem } from './types';

const rssParser = new Parser({
  timeout: 5000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; MediaCheck/1.0)',
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
      return (parsed.items || []).slice(0, 15).map((item) => ({
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

/**
 * GNews.io — backup for NewsAPI with independent 100 req/day limit.
 */
export async function fetchGNews(query: string, limit = 5): Promise<FeedItem[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      lang: 'es',
      max: String(limit),
      token: apiKey,
    });

    const res = await fetch(`https://gnews.io/api/v4/search?${params}`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.articles || []).map((article: any) => ({
      title: article.title || '',
      link: article.url || '',
      content: (article.description || '').substring(0, 200),
      pubDate: article.publishedAt || new Date().toISOString(),
      source: article.source?.name || 'GNews',
      sourceType: 'newsapi' as const,
    }));
  } catch {
    console.error('Failed to fetch from GNews');
    return [];
  }
}

export async function fetchGDELT(query: string, limit = 10): Promise<FeedItem[]> {
  try {
    const params = new URLSearchParams({
      query,
      mode: 'artlist',
      maxrecords: String(limit),
      format: 'json',
      sort: 'hybridrel',
    });

    const res = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?${params}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) return [];

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.articles || []).map((article: any) => ({
      title: article.title || '',
      link: article.url || '',
      content: `[${article.domain || 'GDELT'}] ${article.language || ''} — ${article.sourcecountry || ''}`.trim(),
      pubDate: article.seendate
        ? new Date(article.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toISOString()
        : new Date().toISOString(),
      source: article.domain || 'GDELT',
      sourceType: 'gdelt' as const,
    }));
  } catch {
    console.error('Failed to fetch from GDELT');
    return [];
  }
}

export async function fetchBlueskySocial(query: string, limit = 10): Promise<FeedItem[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
    });

    const res = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?${params}`,
      { next: { revalidate: 120 } }
    );

    if (!res.ok) return [];

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.posts || []).map((post: any) => ({
      title: `@${post.author?.handle || 'bluesky'}`,
      link: post.uri
        ? `https://bsky.app/profile/${post.author?.handle}/post/${post.uri.split('/').pop()}`
        : '',
      content: post.record?.text || '',
      pubDate: post.record?.createdAt || new Date().toISOString(),
      source: 'Bluesky',
      sourceType: 'bluesky' as const,
    }));
  } catch {
    console.error('Failed to fetch from Bluesky');
    return [];
  }
}

/**
 * Search for relevant sources. Uses NewsAPI + GNews (fallback) + GDELT + Bluesky.
 * Compresses results to save tokens: only title + short description + source.
 */
export async function searchSources(query: string): Promise<{ title: string; url: string; content: string }[]> {
  const [rssItems, newsItems, gnewsItems, gdeltItems, blueskyItems] = await Promise.all([
    fetchRSSFeeds(10),
    fetchNewsAPI(query, 5),
    fetchGNews(query, 5),
    fetchGDELT(query, 10),
    fetchBlueskySocial(query, 5),
  ]);

  const allItems = [...rssItems, ...newsItems, ...gnewsItems, ...gdeltItems, ...blueskyItems];

  // Filter items relevant to the query
  const queryWords = query.toLowerCase().split(/\s+/);
  const relevant = allItems.filter((item) => {
    const text = `${item.title} ${item.content}`.toLowerCase();
    return queryWords.some((word) => word.length > 3 && text.includes(word));
  });

  // Compress for token savings: short content only
  return relevant.slice(0, 10).map((item) => ({
    title: item.title,
    url: item.link,
    content: item.content.substring(0, 200),
  }));
}
