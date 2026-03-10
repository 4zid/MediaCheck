import { NextResponse } from 'next/server';
import { fetchRSSFeeds, fetchGDELT } from '@/lib/feeds';
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

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function getAllNews(): Promise<FeedItem[]> {
  const [rssItems, gdeltPolitics, gdeltEconomy, gdeltTech] = await Promise.all([
    withTimeout(fetchRSSFeeds(60), 6000, []),
    withTimeout(fetchGDELT('politics', 15), 5000, []),
    withTimeout(fetchGDELT('economy', 10), 5000, []),
    withTimeout(fetchGDELT('technology', 10), 5000, []),
  ]);

  const seen = new Set<string>();
  const all: FeedItem[] = [];

  for (const item of [...rssItems, ...gdeltPolitics, ...gdeltEconomy, ...gdeltTech]) {
    if (!item.link || !item.title || seen.has(item.link)) continue;
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

    const allItems = await getAllNews();
    const page = allItems.slice(offset, offset + limit);

    if (page.length === 0) {
      return NextResponse.json({ items: [], hasMore: false, total: 0 });
    }

    // Try to match DB verifications — optional, never throws
    let claimMap = new Map<string, { id: string; category: string; verdict: string; confidence: number }>();
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceKey && !supabaseUrl.includes('placeholder') && !supabaseUrl.includes('your-project')) {
        const { createServiceClient } = await import('@/lib/supabase/server');
        const supabase = createServiceClient();
        const urls = page.map((i) => i.link).filter(Boolean);

        const { data: claims } = await supabase
          .from('claims')
          .select('id, source_url, category, verification:verifications(verdict, confidence)')
          .in('source_url', urls);

        claimMap = new Map(
          (claims || []).map((c) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ver = (c.verification as any[])?.[0];
            return [c.source_url, { id: c.id, category: c.category, verdict: ver?.verdict, confidence: ver?.confidence }];
          })
        );
      }
    } catch (dbErr) {
      console.error('DB lookup failed (non-fatal):', dbErr);
    }

    const items: NewsItem[] = page.map((item) => {
      const match = claimMap.get(item.link);
      const status: NewsStatus = match?.verdict ? verdictToStatus(match.verdict) : 'sin-verificar';

      return {
        title: item.title,
        source: item.source,
        pubDate: item.pubDate,
        link: item.link,
        status,
        confidence: status === 'estimacion' ? match?.confidence : undefined,
        claimId: match?.id,
        category: match?.category,
      };
    });

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
