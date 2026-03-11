import { NextRequest } from 'next/server';
import { fetchArgentinaFeed, categorizeArticle } from '@/lib/argentina/feeds';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '30', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    let items = await fetchArgentinaFeed(limit + offset + 20);

    // Auto-categorize
    items = items.map(item => ({
      ...item,
      category: categorizeArticle(item.title, item.content),
    }));

    // Filter by category if specified
    if (category && category !== 'all') {
      items = items.filter(item => (item as typeof item & { category: string }).category === category);
    }

    const paged = items.slice(offset, offset + limit);

    return Response.json({
      items: paged.map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        source: item.source,
        sourceType: item.sourceType,
        category: (item as typeof item & { category: string }).category || 'other',
      })),
      hasMore: items.length > offset + limit,
      total: items.length,
    });
  } catch (err) {
    console.error('Argentina feed error:', err);
    return Response.json({ items: [], hasMore: false, total: 0 });
  }
}
