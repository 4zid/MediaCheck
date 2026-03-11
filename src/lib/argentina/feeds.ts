import Parser from 'rss-parser';
import type { FeedItem } from '../types';

const rssParser = new Parser({
  timeout: 5000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; MediaCheck/1.0)',
  },
});

const ARGENTINA_RSS_FEEDS = [
  { url: 'https://www.infobae.com/feeds/rss/', name: 'Infobae' },
  { url: 'https://www.clarin.com/rss/lo-ultimo/', name: 'Clarin' },
  { url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/', name: 'La Nacion' },
  { url: 'https://www.pagina12.com.ar/rss/portada', name: 'Pagina 12' },
  { url: 'https://www.ambito.com/rss/pages.xml', name: 'Ambito' },
  { url: 'https://chequeado.com/feed/', name: 'Chequeado' },
];

/**
 * Fetch Argentine RSS feeds.
 */
export async function fetchArgentinaRSS(limit = 30): Promise<FeedItem[]> {
  const results: FeedItem[] = [];

  const feedPromises = ARGENTINA_RSS_FEEDS.map(async (feed) => {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      return (parsed.items || []).slice(0, 10).map((item) => ({
        title: item.title || '',
        link: item.link || '',
        content: item.contentSnippet || item.content || '',
        pubDate: item.pubDate || new Date().toISOString(),
        source: feed.name,
        sourceType: 'rss' as const,
      }));
    } catch {
      console.error(`Failed to fetch AR RSS: ${feed.name}`);
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

/**
 * Fetch GDELT articles from Argentina.
 */
export async function fetchGDELTArgentina(limit = 15): Promise<FeedItem[]> {
  try {
    const params = new URLSearchParams({
      query: 'sourcecountry:AR',
      mode: 'ArtList',
      maxrecords: String(limit),
      format: 'json',
      sort: 'DateDesc',
    });

    const res = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?${params}`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } }
    );

    if (!res.ok) return [];

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.articles || []).map((article: any) => ({
      title: article.title || '',
      link: article.url || '',
      content: `[${article.domain || 'GDELT AR'}] ${article.language || ''} — ${article.sourcecountry || 'AR'}`.trim(),
      pubDate: article.seendate
        ? new Date(article.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toISOString()
        : new Date().toISOString(),
      source: article.domain || 'GDELT AR',
      sourceType: 'gdelt' as const,
    }));
  } catch {
    console.error('Failed to fetch GDELT Argentina');
    return [];
  }
}

/**
 * Fetch GNews Argentina articles.
 */
export async function fetchGNewsArgentina(limit = 10): Promise<FeedItem[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      country: 'ar',
      lang: 'es',
      max: String(limit),
      token: apiKey,
    });

    const res = await fetch(`https://gnews.io/api/v4/top-headlines?${params}`, {
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
      source: article.source?.name || 'GNews AR',
      sourceType: 'newsapi' as const,
    }));
  } catch {
    console.error('Failed to fetch GNews Argentina');
    return [];
  }
}

/**
 * Fetch NewsAPI Argentina articles.
 */
export async function fetchNewsAPIArgentina(limit = 10): Promise<FeedItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      country: 'ar',
      pageSize: String(limit),
      apiKey,
    });

    const res = await fetch(`https://newsapi.org/v2/top-headlines?${params}`, {
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
      source: article.source?.name || 'NewsAPI AR',
      sourceType: 'newsapi' as const,
    }));
  } catch {
    console.error('Failed to fetch NewsAPI Argentina');
    return [];
  }
}

/**
 * Combined Argentina feed — all sources in parallel.
 */
export async function fetchArgentinaFeed(limit = 30): Promise<FeedItem[]> {
  const [rss, gdelt, gnews, newsapi] = await Promise.all([
    fetchArgentinaRSS(20),
    fetchGDELTArgentina(15),
    fetchGNewsArgentina(10),
    fetchNewsAPIArgentina(10),
  ]);

  return [...rss, ...gdelt, ...gnews, ...newsapi]
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, limit);
}

/**
 * Auto-categorize Argentine articles based on keywords.
 */
export function categorizeArticle(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  const POLITICS = ['milei', 'congreso', 'diputados', 'senado', 'gobierno', 'DNU', 'decreto', 'presidente', 'ministr', 'legislat', 'kirchner', 'peronismo', 'libertad avanza', 'bullrich', 'massa'];
  const ECONOMY = ['dólar', 'dolar', 'inflación', 'inflacion', 'bcra', 'reservas', 'fmi', 'deuda', 'tarifa', 'impuesto', 'cepo', 'riesgo país', 'riesgo pais', 'mep', 'ccl', 'blue', 'sueldo', 'salario', 'jubilaci'];
  const JUSTICE = ['judicial', 'juez', 'jueza', 'tribunal', 'causa', 'procesad', 'imputad', 'fiscal', 'corte suprema', 'condenad', 'absolv', 'comodoro py'];
  const SOCIAL = ['educación', 'educacion', 'universidad', 'salud', 'hospital', 'protesta', 'marcha', 'paro', 'sindicat', 'docente', 'inseguridad', 'pobreza'];

  if (POLITICS.some(kw => text.includes(kw))) return 'politics';
  if (ECONOMY.some(kw => text.includes(kw))) return 'economy';
  if (JUSTICE.some(kw => text.includes(kw))) return 'justice';
  if (SOCIAL.some(kw => text.includes(kw))) return 'social';
  return 'other';
}
