import { NextResponse } from 'next/server';
import { fetchRSSFeeds } from '@/lib/feeds';
import { factCheck } from '@/lib/claude';
import { queryGoogleFactCheck, googleClaimsToSources } from '@/lib/googleFactCheck';
import { getCredibilityScore, getSourceName } from '@/lib/sources';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = createServiceClient();

    // Skip if DB already has claims
    const { count } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true });

    if ((count ?? 0) >= 5) {
      return NextResponse.json({ verified: 0, skipped: true });
    }

    const rssItems = await fetchRSSFeeds(15);
    let verified = 0;

    for (const item of rssItems.slice(0, 3)) {
      try {
        if (!item.title || item.title.length < 10) continue;

        // Skip if already stored
        const { data: existing } = await supabase
          .from('claims')
          .select('id')
          .ilike('content', `%${item.title.slice(0, 40)}%`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Gather context sources
        const [googleResult] = await Promise.all([
          queryGoogleFactCheck(item.title),
        ]);
        const googleSources = googleClaimsToSources(googleResult.claims);
        const contextSources = [
          { title: item.title, url: item.link, content: item.content },
          ...googleSources,
        ];

        // Fact-check with Claude
        const result = await factCheck(item.title, contextSources);

        // Store claim
        const { data: claimData, error: claimError } = await supabase
          .from('claims')
          .insert({
            content: item.title,
            source_url: item.link || null,
            source_type: 'rss',
            category: result.category || 'other',
          })
          .select()
          .single();

        if (claimError || !claimData) continue;

        // Store verification
        const { data: verData, error: verError } = await supabase
          .from('verifications')
          .insert({
            claim_id: claimData.id,
            verdict: result.verdict,
            confidence: result.confidence,
            summary: result.summary,
            analysis: result.analysis,
            ai_model: 'claude-sonnet-4-6',
          })
          .select()
          .single();

        if (!verError && verData && result.sources.length > 0) {
          await supabase.from('verification_sources').insert(
            result.sources.map((s) => ({
              verification_id: verData.id,
              url: s.url,
              title: s.title,
              snippet: s.snippet,
              credibility_score: s.credibility_score || getCredibilityScore(s.url),
              supports_claim: s.supports_claim,
              source_name: s.source_name || getSourceName(s.url),
            }))
          );
        }

        verified++;
      } catch (err) {
        console.error('Auto-verify item failed:', err);
      }
    }

    return NextResponse.json({ verified });
  } catch (error) {
    console.error('Auto-verify error:', error);
    return NextResponse.json({ error: 'Auto-verify failed' }, { status: 500 });
  }
}
