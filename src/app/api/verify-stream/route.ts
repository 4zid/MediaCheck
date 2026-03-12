import { NextRequest } from 'next/server';
import { classifyWithHaiku, factCheck } from '@/lib/claude';
import { searchSources } from '@/lib/feeds';
import { queryGoogleFactCheck, googleClaimsToSources } from '@/lib/googleFactCheck';
import { searchWikipedia } from '@/lib/wikipedia';
import { scoreClaim } from '@/lib/claimbuster';
import { searchContextualSources } from '@/lib/contextual';
import { getCredibilityScore, getSourceName } from '@/lib/sources';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function getSupabaseDirectClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey);
}

// Map Google FC ratings to our verdict types
function ratingToVerdict(rating: string): string {
  const r = rating.toLowerCase();
  if (r.includes('verdadero') || r.includes('true') || r.includes('correct')) return 'verified';
  if (r.includes('falso') || r.includes('false') || r.includes('incorrect') || r.includes('fake')) return 'false';
  if (r.includes('engañoso') || r.includes('misleading') || r.includes('deceiving')) return 'misleading';
  if (r.includes('parcial') || r.includes('half') || r.includes('mixed') || r.includes('partly')) return 'partially_true';
  return 'unverified';
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
        // ─── STEP 1: ClaimBuster — filter opinions (0 Claude tokens) ───
        controller.enqueue(encoder.encode(sseEvent('step', {
          step: 'searching_sources',
          label: 'Evaluando verificabilidad del claim...',
        })));

        const [claimScores, googleResult] = await Promise.all([
          scoreClaim(claim).catch(() => [{ text: claim, score: 0.7 }]),
          queryGoogleFactCheck(claim).catch(() => ({ claims: [] })),
        ]);

        const topScore = claimScores.sort((a, b) => b.score - a.score)[0];

        // If claim is clearly not verifiable (opinion), skip expensive analysis
        if (topScore && topScore.score < 0.3) {
          controller.enqueue(encoder.encode(sseEvent('step', {
            step: 'complete',
            label: 'Verificación completa',
            data: {
              claimId: null,
              verdict: 'unverified',
              confidence: 20,
              summary: 'El texto no contiene afirmaciones factuales claramente verificables. Parece ser una opinión o declaración subjetiva.',
              analysis: 'El análisis automático determinó que este texto tiene un bajo puntaje de verificabilidad, lo que indica que se trata principalmente de una opinión o afirmación subjetiva, no de un hecho comprobable.',
              sources: [],
            },
          })));
          controller.close();
          return;
        }

        // ─── STEP 2: Google Fact Check — already verified? (0 Claude tokens) ───
        const googleSources = googleClaimsToSources(googleResult.claims);

        if (googleResult.claims.length > 0) {
          controller.enqueue(encoder.encode(sseEvent('step', {
            step: 'checking_factcheckers',
            label: `${googleResult.claims.length} verificaciones previas encontradas`,
            data: { count: googleResult.claims.length },
          })));

          // Short-circuit: if a credible fact-checker already verified this, return directly
          const topClaim = googleResult.claims[0];
          const topReview = topClaim.claimReview?.[0];
          if (topReview) {
            const verdict = ratingToVerdict(topReview.textualRating);
            const sources = googleResult.claims.flatMap(c =>
              c.claimReview.map(r => ({
                url: r.url,
                title: r.title || c.text,
                snippet: `[${r.publisher.name}] ${r.textualRating}`,
                credibility_score: 90,
                supports_claim: verdict === 'verified',
                source_name: r.publisher.name,
              }))
            );

            const result = {
              verdict,
              confidence: 85,
              summary: `Ya verificado por ${topReview.publisher.name}: ${topReview.textualRating}`,
              analysis: `La afirmación "${claim.substring(0, 100)}..." fue previamente verificada por ${topReview.publisher.name} con el resultado: "${topReview.textualRating}". Esta verificación proviene de la base de datos global ClaimReview, que agrupa verificaciones de fact-checkers certificados.`,
              sources,
              category: 'other',
            };

            // Persist short-circuit result
            await persistResult(claim, sourceUrl, result);

            controller.enqueue(encoder.encode(sseEvent('step', {
              step: 'complete',
              label: 'Verificación completa (fact-check existente)',
              data: {
                claimId: null,
                ...result,
              },
            })));
            controller.close();
            return;
          }
        }

        // ─── STEP 3: Haiku classification (very cheap ~$0.001) ───
        controller.enqueue(encoder.encode(sseEvent('step', {
          step: 'searching_sources',
          label: 'Clasificando claim con IA...',
        })));

        const classification = await classifyWithHaiku(claim);

        if (classification && !classification.verifiable) {
          controller.enqueue(encoder.encode(sseEvent('step', {
            step: 'complete',
            label: 'Verificación completa',
            data: {
              claimId: null,
              verdict: 'unverified',
              confidence: 15,
              summary: 'El texto no contiene una afirmación factual verificable.',
              analysis: 'El análisis previo con IA determinó que este texto es una opinión, predicción o declaración subjetiva que no puede ser verificada con fuentes factuales.',
              sources: [],
            },
          })));
          controller.close();
          return;
        }

        // ─── STEP 4: Search sources in parallel (0 Claude tokens) ───
        controller.enqueue(encoder.encode(sseEvent('step', {
          step: 'sources_found',
          label: 'Buscando fuentes y contexto...',
        })));

        const [contextSources, wikiResults, contextualResults] = await Promise.all([
          searchSources(claim).catch(() => []),
          searchWikipedia(claim).catch(() => []),
          searchContextualSources(classification?.category || 'other', classification?.urgency || 'medium', claim).catch(() => []),
        ]);

        // Add Wikipedia as sources
        const wikiSources = wikiResults.map(w => ({
          title: w.title,
          url: `https://es.wikipedia.org/wiki/${encodeURIComponent(w.title)}`,
          content: w.extract,
          date: undefined as string | undefined,
        }));

        const allSources = [...contextSources, ...googleSources, ...wikiSources, ...contextualResults];

        controller.enqueue(encoder.encode(sseEvent('step', {
          step: 'sources_found',
          label: `${allSources.length} fuentes encontradas`,
          data: { count: allSources.length },
        })));

        // ─── STEP 5: Sonnet deep analysis (only when needed) ───
        controller.enqueue(encoder.encode(sseEvent('step', {
          step: 'analyzing',
          label: 'Analizando con IA (análisis profundo)...',
        })));

        const result = await factCheck(claim, allSources);

        // ─── STEP 6: Persist to Supabase ───
        const claimId = await persistResult(claim, sourceUrl, result);

        // ─── STEP 7: Complete ───
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

// Best-effort persist to Supabase
async function persistResult(
  claim: string,
  sourceUrl: string | undefined,
  result: { verdict: string; confidence: number; summary: string; analysis: string; category?: string; sources: { url: string; title: string; snippet: string; credibility_score: number; supports_claim: boolean; source_name: string }[] }
): Promise<string | null> {
  try {
    const supabase = getSupabaseDirectClient();
    if (!supabase) return null;

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

    if (!claimData) return null;

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

    if (verificationData && result.sources.length > 0) {
      const sourcesToInsert = result.sources.map((s) => ({
        verification_id: verificationData.id,
        url: s.url,
        title: s.title,
        snippet: s.snippet,
        credibility_score: s.credibility_score || getCredibilityScore(s.url),
        supports_claim: s.supports_claim,
        source_name: s.source_name || getSourceName(s.url),
      }));

      await supabase.from('verification_sources').insert(sourcesToInsert);
    }

    return claimData.id;
  } catch (dbErr) {
    console.error('DB persist error (non-fatal):', dbErr);
    return null;
  }
}
