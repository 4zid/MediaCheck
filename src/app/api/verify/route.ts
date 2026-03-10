import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { factCheck } from '@/lib/claude';
import { searchSources } from '@/lib/feeds';
import { queryGoogleFactCheck, googleClaimsToSources } from '@/lib/googleFactCheck';
import { getCredibilityScore, getSourceName } from '@/lib/sources';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')) {
      return NextResponse.json({ cached: false });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: claims } = await supabase
      .from('claims')
      .select(`
        *,
        verification:verifications(
          *,
          sources:verification_sources(*)
        )
      `)
      .eq('source_url', url)
      .limit(1);

    if (claims && claims.length > 0) {
      const claim = claims[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const verArr = (claim.verification as any[]) || [];
      if (verArr.length > 0) {
        return NextResponse.json({
          cached: true,
          result: {
            claimId: claim.id,
            verdict: verArr[0].verdict,
            confidence: verArr[0].confidence,
            summary: verArr[0].summary,
            analysis: verArr[0].analysis,
            created_at: verArr[0].created_at,
            sources: (verArr[0].sources || []).map((s: Record<string, unknown>) => ({
              url: s.url,
              title: s.title,
              snippet: s.snippet,
              credibility_score: s.credibility_score,
              supports_claim: s.supports_claim,
              source_name: s.source_name,
            })),
          },
        });
      }
    }

    return NextResponse.json({ cached: false });
  } catch (error) {
    console.error('Cache lookup error:', error);
    return NextResponse.json({ cached: false });
  }
}

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
        ai_model: 'claude-sonnet-4-6',
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
