import { NextResponse } from 'next/server';
import { fetchRSSFeeds, fetchNewsAPI } from '@/lib/feeds';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    const [rssItems, newsItems] = await Promise.all([
      fetchRSSFeeds(limit),
      query ? fetchNewsAPI(query, limit) : Promise.resolve([]),
    ]);

    const items = [...rssItems, ...newsItems]
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, limit);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Feeds error:', error);
    return NextResponse.json({ items: [] });
  }
}
