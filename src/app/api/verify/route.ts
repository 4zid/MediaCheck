import { NextRequest, NextResponse } from 'next/server';
import { factCheck } from '@/lib/claude';
import { searchSources } from '@/lib/feeds';
import { queryGoogleFactCheck, googleClaimsToSources } from '@/lib/googleFactCheck';
import { getCredibilityScore, getSourceName } from '@/lib/sources';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claim, sourceUrl, userId } = body;

    if (!claim || typeof claim !== 'string' || claim.trim().length < 10) {
      return NextResponse.json(
        { error: 'El claim debe tener al menos 10 caracteres' },
        { status: 400 }
      );
    }

    // 1. Search for relevant sources (RSS/NewsAPI + Google Fact Check)
    const [contextSources, googleResult] = await Promise.all([
      searchSources(claim),
      queryGoogleFactCheck(claim),
    ]);
    const googleSources = googleClaimsToSources(googleResult.claims);
    const allSources = [...contextSources, ...googleSources];

    // 2. Run fact-check with Claude
    const result = await factCheck(claim, allSources);

    // 3. Store in database
    const supabase = createServiceClient();

    // Insert claim
    const { data: claimData, error: claimError } = await supabase
      .from('claims')
      .insert({
        content: claim.trim(),
        source_url: sourceUrl || null,
        source_type: sourceUrl ? 'url' : 'manual',
        category: result.category || 'other',
        user_id: userId || null,
      })
      .select()
      .single();

    if (claimError) {
      console.error('Error inserting claim:', claimError);
      // Return result without DB persistence
      return NextResponse.json({ result, stored: false });
    }

    // Insert verification
    const { data: verificationData, error: verError } = await supabase
      .from('verifications')
      .insert({
        claim_id: claimData.id,
        verdict: result.verdict,
        confidence: result.confidence,
        summary: result.summary,
        analysis: result.analysis,
        ai_model: 'claude-sonnet-4-5-20250929',
      })
      .select()
      .single();

    if (!verError && verificationData) {
      // Insert sources
      const sourcesToInsert = result.sources.map((s) => ({
        verification_id: verificationData.id,
        url: s.url,
        title: s.title,
        snippet: s.snippet,
        credibility_score: s.credibility_score || getCredibilityScore(s.url),
        supports_claim: s.supports_claim,
        source_name: s.source_name || getSourceName(s.url),
      }));

      if (sourcesToInsert.length > 0) {
        await supabase.from('verification_sources').insert(sourcesToInsert);
      }
    }

    return NextResponse.json({
      claim: claimData,
      verification: verificationData,
      result,
      stored: true,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Error al verificar el claim. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
