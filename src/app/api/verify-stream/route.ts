import { NextRequest } from 'next/server';
import { factCheck } from '@/lib/claude';
import { searchSources } from '@/lib/feeds';
import { queryGoogleFactCheck, googleClaimsToSources } from '@/lib/googleFactCheck';
import { getCredibilityScore, getSourceName } from '@/lib/sources';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function getSupabaseDirectClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey);
}

export async function POST(request: NextRequest) {
  let body: { claim?: string; sourceUrl?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { claim, sourceUrl } = body;

  if (!claim || typeof claim !== 'string' || claim.trim().length < 10) {
    return new Response(JSON.stringify({ error: 'Claim too short' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check Anthropic API key before starting stream
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Searching sources
        controller.enqueue(encoder.encode(sseEvent('step', {
          step: 'searching_sources',
          label: 'Buscando fuentes relevantes...',
        })));

        // Step 2: Search in parallel
        const [contextSources, googleResult] = await Promise.all([
          searchSources(claim).catch(() => []),
          queryGoogleFactCheck(claim).catch(() => ({ claims: [] })),
        ]);
        const googleSources = googleClaimsToSources(googleResult.claims);
        const allSources = [...contextSources, ...googleSources];

        // Step 3: Sources found
        controller.enqueue(encoder.encode(sseEvent('step', {
          step: 'sources_found',
          label: `${allSources.length} fuentes encontradas`,
          data: { count: allSources.length },
        })));

        // Step 4: Checking fact-checkers
        if (googleSources.length > 0) {
          controller.enqueue(encoder.encode(sseEvent('step', {
            step: 'checking_factcheckers',
            label: `${googleSources.length} verificaciones previas encontradas`,
            data: { count: googleSources.length },
          })));
        }

        // Step 5: Analyzing with AI
        controller.enqueue(encoder.encode(sseEvent('step', {
          step: 'analyzing',
          label: 'Analizando con inteligencia artificial...',
        })));

        const result = await factCheck(claim, allSources);

        // Step 6: Persist to Supabase (best-effort, using direct client to avoid cookies() issue)
        let claimId: string | null = null;
        try {
          const supabase = getSupabaseDirectClient();

          if (supabase) {
            const { data: claimData } = await supabase
              .from('claims')
              .insert({
                content: claim.trim(),
                source_url: sourceUrl || null,
                source_type: sourceUrl ? 'url' : 'manual',
                category: result.category || 'other',
                user_id: null,
              })
              .select()
              .single();

            if (claimData) {
              claimId = claimData.id;

              const { data: verificationData } = await supabase
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

              if (verificationData) {
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
            }
          }
        } catch (dbErr) {
          console.error('DB persist error (non-fatal):', dbErr);
        }

        // Step 7: Complete
        controller.enqueue(encoder.encode(sseEvent('step', {
          step: 'complete',
          label: 'Verificación completa',
          data: {
            claimId,
            verdict: result.verdict,
            confidence: result.confidence,
            summary: result.summary,
            analysis: result.analysis,
            sources: result.sources,
          },
        })));

        controller.close();
      } catch (error) {
        console.error('Stream verification error:', error);
        const msg = error instanceof Error ? error.message : 'Error al verificar';
        controller.enqueue(encoder.encode(sseEvent('error', {
          message: `Error al verificar: ${msg.slice(0, 200)}`,
        })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
