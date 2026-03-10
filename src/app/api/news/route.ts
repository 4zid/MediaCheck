import { NextResponse } from 'next/server';
import { fetchRSSFeeds, fetchGDELT } from '@/lib/feeds';
import { createServiceClient } from '@/lib/supabase/server';
import type { FeedItem } from '@/lib/types';

export type NewsStatus =
  | 'sin-verificar'
  | 'analizando'
  | 'verdadero'
  | 'fake'
  | 'chequeado'
  | 'estimacion';

export interface NewsItem {
  title: string;
  source: string;
  pubDate: string;
  link: string;
  status: NewsStatus;
  confidence?: number;
  claimId?: string;
  category?: string;
}

function verdictToStatus(verdict: string): NewsStatus {
  switch (verdict) {
    case 'verified': return 'verdadero';
    case 'false': return 'fake';
    case 'partially_true': return 'chequeado';
    case 'misleading': return 'chequeado';
    case 'unverified': return 'estimacion';
    default: return 'sin-verificar';
  }
}

async function getAllNews(): Promise<FeedItem[]> {
  // Run RSS + GDELT in parallel with overall timeout
  const timeout = new Promise<FeedItem[]>((resolve) =>
    setTimeout(() => resolve([]), 8000)
  );

  const gdeltQueries = ['politics', 'economy', 'technology', 'health'];

  const [rssResult, ...gdeltResults] = await Promise.allSettled([
    Promise.race([fetchRSSFeeds(75), timeout]),
    ...gdeltQueries.map((q) =>
      Promise.race([fetchGDELT(q, 15), new Promise<FeedItem[]>((r) => setTimeout(() => r([]), 6000))])
    ),
  ]);

  const rssItems = rssResult.status === 'fulfilled' ? rssResult.value : [];
  const gdeltItems = gdeltResults.flatMap((r) =>
    r.status === 'fulfilled' ? r.value : []
  );

  // Merge, deduplicate by URL, sort by date
  const seen = new Set<string>();
  const all: FeedItem[] = [];

  for (const item of [...rssItems, ...gdeltItems]) {
    if (!item.link || seen.has(item.link) || !item.title) continue;
    seen.add(item.link);
    all.push(item);
  }

  return all.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');

  const allItems = await getAllNews();
  const page = allItems.slice(offset, offset + limit);

  if (page.length === 0) {
    return NextResponse.json({ items: [], hasMore: false, total: 0 });
  }

  // Match against DB verifications by source_url
  const supabase = createServiceClient();
  const urls = page.map((i) => i.link).filter(Boolean);

  const { data: claims } = await supabase
    .from('claims')
    .select('id, source_url, category, verification:verifications(verdict, confidence)')
    .in('source_url', urls);

  const claimMap = new Map((claims || []).map((c) => [c.source_url, c]));

  const items: NewsItem[] = page.map((item) => {
    const claim = claimMap.get(item.link);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ver = (claim?.verification as any[])?.[0];
    const status: NewsStatus = ver ? verdictToStatus(ver.verdict) : 'sin-verificar';

    return {
      title: item.title,
      source: item.source,
      pubDate: item.pubDate,
      link: item.link,
      status,
      confidence: status === 'estimacion' ? ver?.confidence : undefined,
      claimId: claim?.id,
      category: claim?.category,
    };
  });

  return NextResponse.json({
    items,
    hasMore: offset + limit < allItems.length,
    total: allItems.length,
  });
}
