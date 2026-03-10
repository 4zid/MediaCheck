import { NextResponse } from 'next/server';
import { searchSources } from '@/lib/feeds';
import { getCredibilityScore, getSourceName } from '@/lib/sources';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    const sources = await searchSources(query);

    const enriched = sources.map((s) => ({
      ...s,
      credibility_score: getCredibilityScore(s.url),
      source_name: getSourceName(s.url),
    }));

    return NextResponse.json({ sources: enriched });
  } catch (error) {
    console.error('Sources error:', error);
    return NextResponse.json({ sources: [] });
  }
}
