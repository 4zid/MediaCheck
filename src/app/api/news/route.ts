import { NextResponse } from 'next/server';
import { fetchRSSFeeds, fetchGDELT } from '@/lib/feeds';
import type { FeedItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export interface NewsItem {
  title: string;
  source: string;
  pubDate: string;
  link: string;
  status: 'sin-verificar';
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function getAllNews(source?: string, category?: string): Promise<FeedItem[]> {
  const [rssItems, gdeltPolitics, gdeltEconomy, gdeltTech] = await Promise.all([
    withTimeout(fetchRSSFeeds(60), 6000, []),
    withTimeout(fetchGDELT(category || 'politics', 15), 5000, []),
    withTimeout(fetchGDELT('economy', 10), 5000, []),
    withTimeout(fetchGDELT('technology', 10), 5000, []),
  ]);

  const seen = new Set<string>();
  const all: FeedItem[] = [];

  for (const item of [...rssItems, ...gdeltPolitics, ...gdeltEconomy, ...gdeltTech]) {
    if (!item.link || !item.title || seen.has(item.link)) continue;
    if (source && !item.source.toLowerCase().includes(source.toLowerCase())) continue;
    seen.add(item.link);
    all.push(item);
  }

  return all.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const source = searchParams.get('source') || undefined;
    const category = searchParams.get('category') || undefined;

    const allItems = await getAllNews(source, category);
    const page = allItems.slice(offset, offset + limit);

    if (page.length === 0) {
      return NextResponse.json({ items: [], hasMore: false, total: 0 });
    }

    const items: NewsItem[] = page.map((item) => ({
      title: item.title,
      source: item.source,
      pubDate: item.pubDate,
      link: item.link,
      status: 'sin-verificar' as const,
    }));

    return NextResponse.json({
      items,
      hasMore: offset + limit < allItems.length,
      total: allItems.length,
    });
  } catch (err) {
    console.error('/api/news error:', err);
    return NextResponse.json({ items: [], hasMore: false, total: 0, error: 'fetch_failed' });
  }
}
