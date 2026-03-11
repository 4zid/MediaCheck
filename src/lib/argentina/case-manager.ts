/**
 * Argentina Case Manager — maintains exactly 3 active investigations.
 * Uses Haiku for case decisions (cheap) and filters for relevance.
 */

import { createClient } from '@supabase/supabase-js';
import { fetchArgentinaFeed } from './feeds';
import { filterArticles, type ScoredArticle } from './filter';
import { getCredibilityScore, getSourceName } from '../sources';
import { getEconomicSnapshot } from './economic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('placeholder') || url.includes('your-project')) return null;
  return createClient(url, key);
}

interface ActiveCase {
  id: string;
  title: string;
  category: string;
  status: string;
  verdict: string | null;
  confidence: number;
  source_count: number;
  last_checked_at: string | null;
  created_at: string;
}

/**
 * Ask Haiku if a cluster of articles deserves an investigation case.
 */
async function askHaikuCaseDecision(
  articles: ScoredArticle[],
  activeCases: ActiveCase[],
): Promise<{
  decision: 'OPEN_CASE' | 'REJECT';
  title?: string;
  summary?: string;
  category?: string;
  confidence?: number;
} | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const articleList = articles.slice(0, 6).map((a, i) =>
    `${i + 1}. [${a.source}] ${a.title}`
  ).join('\n');

  const caseList = activeCases.length > 0
    ? activeCases.map(c => `- ${c.title} (${c.category})`).join('\n')
    : 'Ninguno';

  const today = new Date().toISOString().slice(0, 10);

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Fecha: ${today}. Sos editor de un medio de verificación argentino. Decidí si estos artículos merecen abrir un caso de investigación.

CRITERIOS PARA ABRIR: impacto real en argentinos (política, economía, justicia, social), afirmaciones contradictorias, tema en desarrollo activo, actores de poder involucrados.
CRITERIOS PARA RECHAZAR: farándula, deportes, clickbait, noticia rutinaria sin novedad, ya resuelto, sensacionalismo.

ARTÍCULOS:
${articleList}

CASOS ACTIVOS (no duplicar):
${caseList}

Respondé SOLO JSON:
{"decision":"OPEN_CASE"|"REJECT","title":"título si OPEN_CASE","summary":"2 oraciones si OPEN_CASE","category":"politics|economy|justice|social","confidence":0-100}`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (err) {
    console.error('Haiku case decision failed:', err);
    return null;
  }
}

/**
 * Group articles by similarity (shared keywords).
 */
function clusterArticles(articles: ScoredArticle[]): ScoredArticle[][] {
  const clusters: ScoredArticle[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < articles.length; i++) {
    if (used.has(i)) continue;

    const cluster = [articles[i]];
    used.add(i);

    const wordsA = articles[i].title.toLowerCase().split(/\s+/).filter(w => w.length > 4);

    for (let j = i + 1; j < articles.length; j++) {
      if (used.has(j)) continue;

      const wordsB = articles[j].title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const overlap = wordsA.filter(w => wordsB.includes(w)).length;

      // Consider related if 2+ significant words overlap
      if (overlap >= 2) {
        cluster.push(articles[j]);
        used.add(j);
      }
    }

    clusters.push(cluster);
  }

  // Sort clusters by size (bigger = more important)
  return clusters.sort((a, b) => b.length - a.length);
}

/**
 * Check if a cluster topic is too similar to an existing case.
 */
function isDuplicateOfActive(cluster: ScoredArticle[], activeCases: ActiveCase[]): boolean {
  const clusterWords = cluster[0].title.toLowerCase().split(/\s+/).filter(w => w.length > 4);

  return activeCases.some(c => {
    const caseWords = c.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const overlap = clusterWords.filter(w => caseWords.includes(w)).length;
    return overlap >= 2;
  });
}

/**
 * Ensure category diversity — penalize over-represented categories.
 */
function applyDiversityBonus(
  clusters: ScoredArticle[][],
  activeCases: ActiveCase[],
): ScoredArticle[][] {
  const categoryCounts: Record<string, number> = {};
  for (const c of activeCases) {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  }

  // Sort by: cluster size, but penalize categories already represented
  return [...clusters].sort((a, b) => {
    const catA = a[0].category;
    const catB = b[0].category;
    const penaltyA = (categoryCounts[catA] || 0) * 3;
    const penaltyB = (categoryCounts[catB] || 0) * 3;
    return (b.length - penaltyB) - (a.length - penaltyA);
  });
}

/**
 * Determine if a case should be archived.
 */
function shouldArchive(c: ActiveCase): boolean {
  if (c.status === 'resolved') return true;

  const hoursSinceUpdate = c.last_checked_at
    ? (Date.now() - new Date(c.last_checked_at).getTime()) / (1000 * 60 * 60)
    : (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60);

  // No update in 24h+ → archive
  if (hoursSinceUpdate > 24) return true;

  // Over 72h old and low confidence → archive
  const hoursOld = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60);
  if (hoursOld > 72 && (c.confidence || 0) < 30) return true;

  return false;
}

/**
 * Main case management function.
 * Maintains exactly 3 active investigation cases.
 */
export async function manageCases(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  // 1. Get current active cases
  const { data: activeCasesRaw } = await supabase
    .from('investigations')
    .select('id, title, category, status, verdict, confidence, source_count, last_checked_at, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const activeCases: ActiveCase[] = activeCasesRaw || [];

  // 2. Archive stale cases
  const toArchive = activeCases.filter(shouldArchive);
  for (const c of toArchive) {
    await supabase.from('investigations').update({
      status: 'resolved',
      updated_at: new Date().toISOString(),
    }).eq('id', c.id);
  }

  const remaining = activeCases.filter(c => !toArchive.includes(c));
  const slotsAvailable = 3 - remaining.length;

  if (slotsAvailable <= 0) return;

  // 3. Fetch and filter Argentine news
  const rawFeed = await fetchArgentinaFeed(40).catch(() => []);
  const articles = rawFeed.map(item => ({
    title: item.title,
    content: item.content || '',
    url: item.link,
    source: item.source,
    pubDate: item.pubDate,
  }));

  const filtered = filterArticles(articles);
  if (filtered.length === 0) return;

  // 4. Cluster articles by topic
  const clusters = clusterArticles(filtered);

  // 5. Apply diversity bonus
  const ranked = applyDiversityBonus(clusters, remaining);

  // 6. Filter out duplicates of existing cases
  const candidates = ranked.filter(cluster => !isDuplicateOfActive(cluster, remaining));

  // 7. For each candidate, ask Haiku if it deserves a case
  let created = 0;
  for (const cluster of candidates) {
    if (created >= slotsAvailable) break;

    // Only consider clusters with 2+ articles from 2+ sources
    const uniqueSources = new Set(cluster.map(a => a.source));
    if (cluster.length < 2 && uniqueSources.size < 2) {
      // For seed cases (when no cases exist), allow single-article clusters
      if (remaining.length + created > 0) continue;
    }

    const decision = await askHaikuCaseDecision(cluster, [...remaining]);
    if (!decision || decision.decision !== 'OPEN_CASE') continue;

    // Get economic context if economy-related
    let economicContext = null;
    if (decision.category === 'economy') {
      economicContext = await getEconomicSnapshot().catch(() => null);
    }

    // Create the case
    const { data: inv } = await supabase.from('investigations').insert({
      title: (decision.title || cluster[0].title).substring(0, 200),
      summary: (decision.summary || cluster[0].content).substring(0, 500) || null,
      status: 'active',
      category: decision.category || cluster[0].category,
      confidence: decision.confidence || 0,
      source_count: cluster.length,
    }).select().single();

    if (!inv) continue;

    // Insert all cluster articles as sources
    for (const article of cluster.slice(0, 8)) {
      await supabase.from('investigation_sources').insert({
        investigation_id: inv.id,
        url: article.url,
        title: article.title,
        snippet: article.content.substring(0, 300) || null,
        content: article.content || null,
        credibility_score: getCredibilityScore(article.url),
        source_name: article.source || getSourceName(article.url),
        source_type: 'rss',
        published_at: article.pubDate || null,
      });
    }

    // Add initial check record with economic context
    await supabase.from('investigation_checks').insert({
      investigation_id: inv.id,
      verdict: 'unverified',
      confidence: decision.confidence || 0,
      summary: decision.summary || null,
      analysis: economicContext
        ? `Contexto económico: Dólar blue $${economicContext.dolares.find((d: { nombre: string }) => d.nombre === 'Blue')?.venta || '?'}`
        : null,
      sources_added: cluster.length,
    });

    remaining.push({
      id: inv.id,
      title: decision.title || cluster[0].title,
      category: decision.category || cluster[0].category,
      status: 'active',
      verdict: null,
      confidence: decision.confidence || 0,
      source_count: cluster.length,
      last_checked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    created++;
  }

  // 8. Fallback: if we still don't have 3 cases, create from top filtered articles
  const finalSlots = 3 - remaining.length;
  if (finalSlots > 0 && filtered.length > 0) {
    const usedUrls = new Set(remaining.map(c => c.title.toLowerCase()));

    for (const article of filtered) {
      if (remaining.length >= 3) break;
      if (usedUrls.has(article.title.toLowerCase())) continue;

      const { data: inv } = await supabase.from('investigations').insert({
        title: article.title.substring(0, 200),
        summary: article.content.substring(0, 500) || null,
        status: 'active',
        category: article.category,
        source_count: 1,
        confidence: 0,
      }).select().single();

      if (inv) {
        await supabase.from('investigation_sources').insert({
          investigation_id: inv.id,
          url: article.url,
          title: article.title,
          snippet: article.content.substring(0, 300) || null,
          credibility_score: getCredibilityScore(article.url),
          source_name: article.source || getSourceName(article.url),
          source_type: 'rss',
          published_at: article.pubDate || null,
        });

        remaining.push({
          id: inv.id,
          title: article.title,
          category: article.category,
          status: 'active',
          verdict: null,
          confidence: 0,
          source_count: 1,
          last_checked_at: null,
          created_at: new Date().toISOString(),
        });
        usedUrls.add(article.title.toLowerCase());
      }
    }
  }
}
