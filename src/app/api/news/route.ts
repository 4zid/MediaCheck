import { NextResponse } from 'next/server';
import { fetchRSSFeeds } from '@/lib/feeds';
import { createServiceClient } from '@/lib/supabase/server';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Fetch RSS items (grab enough for pagination)
  const allRSS = await fetchRSSFeeds(100);
  const page = allRSS.slice(offset, offset + limit);

  if (page.length === 0) {
    return NextResponse.json({ items: [], hasMore: false, total: allRSS.length });
  }

  // Match against DB by source_url
  const supabase = createServiceClient();
  const urls = page.map((i) => i.link).filter(Boolean);

  const { data: claims } = await supabase
    .from('claims')
    .select(`
      id, source_url, category,
      verification:verifications(verdict, confidence)
    `)
    .in('source_url', urls);

  const claimMap = new Map(
    (claims || []).map((c) => [c.source_url, c])
  );

  const items: NewsItem[] = page.map((rss) => {
    const claim = claimMap.get(rss.link);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ver = (claim?.verification as any[])?.[0];

    const status: NewsStatus = ver ? verdictToStatus(ver.verdict) : 'sin-verificar';
    const confidence = ver?.confidence as number | undefined;

    return {
      title: rss.title,
      source: rss.source,
      pubDate: rss.pubDate,
      link: rss.link,
      status,
      confidence: status === 'estimacion' ? confidence : undefined,
      claimId: claim?.id,
      category: claim?.category,
    };
  });

  return NextResponse.json({
    items,
    hasMore: offset + limit < allRSS.length,
    total: allRSS.length,
  });
}
