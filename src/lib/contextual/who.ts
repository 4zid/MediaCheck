import Parser from 'rss-parser';
import type { ContextualSource } from './types';

const rssParser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MediaCheck/1.0)' },
});

export async function searchWHO(claim: string): Promise<ContextualSource[]> {
  const feed = await rssParser.parseURL('https://www.who.int/feeds/entity/don/en/rss.xml');
  if (!feed.items?.length) return [];

  const keywords = claim.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  return feed.items
    .filter((item) => {
      const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    })
    .slice(0, 5)
    .map((item) => ({
      title: `[WHO] ${item.title || 'Disease Outbreak News'}`,
      url: item.link || 'https://www.who.int/emergencies/disease-outbreak-news',
      content: (item.contentSnippet || item.content || '').slice(0, 500),
      date: item.pubDate,
    }));
}
