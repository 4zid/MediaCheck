/**
 * Google Trends Argentina — free, no API key required.
 * Fetches trending topics from Google Trends RSS for Argentina.
 */

interface TrendingTopic {
  title: string;
  trafficVolume: string;
  newsItems: { title: string; url: string; source: string }[];
  pubDate: string;
}

/**
 * Fetch trending topics from Google Trends Argentina RSS.
 */
export async function fetchGoogleTrendsAR(): Promise<TrendingTopic[]> {
  try {
    const res = await fetch('https://trends.google.com/trending/rss?geo=AR', {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MediaCheck/1.0)',
      },
      next: { revalidate: 600 } as RequestInit['next'],
    });

    if (!res.ok) return [];

    const xml = await res.text();
    return parseGoogleTrendsXML(xml);
  } catch {
    console.error('Failed to fetch Google Trends AR');
    return [];
  }
}

/**
 * Parse Google Trends RSS XML into structured trending topics.
 */
function parseGoogleTrendsXML(xml: string): TrendingTopic[] {
  const topics: TrendingTopic[] = [];

  // Extract each <item> block
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1];

    const title = extractTag(itemXml, 'title') || '';
    const traffic = extractTag(itemXml, 'ht:approx_traffic') || '';
    const pubDate = extractTag(itemXml, 'pubDate') || '';

    // Extract news items within this trend
    const newsItems: { title: string; url: string; source: string }[] = [];
    const newsRegex = /<ht:news_item>([\s\S]*?)<\/ht:news_item>/g;
    let newsMatch;

    while ((newsMatch = newsRegex.exec(itemXml)) !== null) {
      const newsXml = newsMatch[1];
      const newsTitle = extractTag(newsXml, 'ht:news_item_title') || '';
      const newsUrl = extractTag(newsXml, 'ht:news_item_url') || '';
      const newsSource = extractTag(newsXml, 'ht:news_item_source') || '';

      if (newsTitle) {
        newsItems.push({ title: newsTitle, url: newsUrl, source: newsSource });
      }
    }

    if (title) {
      topics.push({
        title,
        trafficVolume: traffic,
        newsItems,
        pubDate,
      });
    }
  }

  return topics;
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA content
  const cdataRegex = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`);
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular content
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Get trending topics as keywords for cross-referencing with news.
 */
export async function getTrendingKeywords(): Promise<string[]> {
  const topics = await fetchGoogleTrendsAR();
  return topics.map(t => t.title);
}
