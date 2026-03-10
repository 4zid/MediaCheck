import Parser from 'rss-parser';
import type { ContextualSource } from './types';

const rssParser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MediaCheck/1.0)' },
});

export async function searchGDACS(claim: string): Promise<ContextualSource[]> {
  const feed = await rssParser.parseURL('https://www.gdacs.org/xml/rss.xml');
  if (!feed.items?.length) return [];

  const keywords = claim.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  return feed.items
    .filter((item) => {
      const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    })
    .slice(0, 5)
    .map((item) => ({
      title: `[GDACS] ${item.title || 'Alert'}`,
      url: item.link || 'https://www.gdacs.org',
      content: (item.contentSnippet || item.content || '').slice(0, 500),
    }));
}
