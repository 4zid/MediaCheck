/**
 * Argentina Case Manager — maintains exactly 3 active investigations.
 * Uses Haiku for case decisions (cheap) and filters for relevance.
 */

import { createClient } from '@supabase/supabase-js';
import { fetchArgentinaFeed } from './feeds';
import { filterArticles, type ScoredArticle } from './filter';
import { getCredibilityScore, getSourceName } from '../sources';
import { getEconomicSnapshot } from './economic';
import { fetchGoogleTrendsAR } from './trends';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
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
  trendingTopics: string[] = [],
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

  const trendsList = trendingTopics.length > 0
    ? `\nTENDENCIAS ACTUALES EN ARGENTINA (Google Trends):\n${trendingTopics.slice(0, 10).map(t => `- ${t}`).join('\n')}\n`
    : '';

  const today = new Date().toISOString().slice(0, 10);

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Fecha: ${today}. Sos editor jefe de un medio de verificación argentino. Decidí si estos artículos merecen abrir un CASO DE INVESTIGACIÓN PROPIO.

IMPORTANTE — NO copies titulares de medios. Creá un título investigativo propio con formato "Caso: [encuadre investigativo]".
Ejemplo MALO: "Milei firmó nuevo DNU sobre tarifas"
Ejemplo BUENO: "Caso: Impacto del nuevo DNU tarifario — Análisis de alcance y efectos en hogares argentinos"

REGLAS ESTRICTAS:
- Solo hechos verificables, NO conjeturas ni especulaciones
- Solo temas con impacto real en argentinos (política, economía, justicia, social)
- RECHAZAR: farándula, deportes, clickbait, noticias rutinarias, mascotas, animales, curiosidades, tech/gadgets, noticias internacionales sin impacto directo en Argentina, fórmula 1, recetas, clima
- El título DEBE empezar con "Caso:" y ser un encuadre investigativo original
- El summary debe explicar QUÉ se investiga y POR QUÉ importa, sin especular
${trendsList}
ARTÍCULOS:
${articleList}

CASOS ACTIVOS (no duplicar):
${caseList}

Respondé SOLO JSON:
{"decision":"OPEN_CASE"|"REJECT","title":"Caso: [encuadre investigativo]","summary":"2 oraciones: qué investigamos y por qué importa a los argentinos","category":"politics|economy|justice|social","confidence":0-100}`,
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
 * Boost clusters that match Google Trends topics.
 */
function boostByTrends(clusters: ScoredArticle[][], trendingKeywords: string[]): ScoredArticle[][] {
  if (trendingKeywords.length === 0) return clusters;

  const trendWords = trendingKeywords
    .flatMap(t => t.toLowerCase().split(/\s+/))
    .filter(w => w.length > 3);

  return [...clusters].sort((a, b) => {
    const textA = a.map(art => art.title).join(' ').toLowerCase();
    const textB = b.map(art => art.title).join(' ').toLowerCase();

    const matchesA = trendWords.filter(w => textA.includes(w)).length;
    const matchesB = trendWords.filter(w => textB.includes(w)).length;

    // Trend-matching clusters get priority, then by size
    const scoreA = a.length + matchesA * 3;
    const scoreB = b.length + matchesB * 3;
    return scoreB - scoreA;
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

  // 2. Auto-purge irrelevant cases (legacy cases without "Caso:" prefix or with blacklisted content)
  const PURGE_KEYWORDS = ['gato', 'piedritas', 'mascota', 'perro', 'fórmula 1', 'formula 1',
    'gran hermano', 'tinelli', 'iphone', 'samsung', 'taylor swift', 'oscar',
    'cachorro', 'veterinaria', 'gaming', 'playstation', 'xbox', 'nintendo'];
  for (const c of activeCases) {
    const titleLower = c.title.toLowerCase();
    const isIrrelevant = PURGE_KEYWORDS.some(kw => titleLower.includes(kw));
    if (isIrrelevant) {
      await supabase.from('investigations').update({
        status: 'dismissed',
        updated_at: new Date().toISOString(),
      }).eq('id', c.id);
    }
  }

  const afterPurge = activeCases.filter(c => {
    const titleLower = c.title.toLowerCase();
    return !PURGE_KEYWORDS.some(kw => titleLower.includes(kw));
  });

  // 3. Archive stale cases
  const toArchive = afterPurge.filter(shouldArchive);
  for (const c of toArchive) {
    await supabase.from('investigations').update({
      status: 'resolved',
      updated_at: new Date().toISOString(),
    }).eq('id', c.id);
  }

  const remaining = afterPurge.filter(c => !toArchive.includes(c));
  const slotsAvailable = 3 - remaining.length;

  if (slotsAvailable <= 0) return;

  // 3. Fetch Argentine news + Google Trends in parallel
  const [rawFeed, trendingTopics] = await Promise.all([
    fetchArgentinaFeed(40).catch(() => []),
    fetchGoogleTrendsAR().catch(() => []),
  ]);

  const trendingKeywords = trendingTopics.map(t => t.title);

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

  // 5. Boost clusters that match Google Trends topics
  const boostedClusters = boostByTrends(clusters, trendingKeywords);

  // 6. Apply diversity bonus
  const ranked = applyDiversityBonus(boostedClusters, remaining);

  // 7. Filter out duplicates of existing cases
  const candidates = ranked.filter(cluster => !isDuplicateOfActive(cluster, remaining));

  // 8. For each candidate, ask Haiku if it deserves a case
  let created = 0;
  for (const cluster of candidates) {
    if (created >= slotsAvailable) break;

    // Require 2+ articles, unless seeding (0 existing cases) — Haiku still reviews all
    if (cluster.length < 2 && remaining.length + created > 0) continue;

    const decision = await askHaikuCaseDecision(cluster, [...remaining], trendingKeywords);
    if (!decision || decision.decision !== 'OPEN_CASE') continue;

    // Get economic context if economy-related
    let economicContext = null;
    if (decision.category === 'economy') {
      economicContext = await getEconomicSnapshot().catch(() => null);
    }

    // Create the case
    const { data: inv } = await supabase.from('investigations').insert({
      title: (decision.title || 'Caso: Investigación en desarrollo').substring(0, 200),
      summary: (decision.summary || `Investigación activa basada en ${cluster.length} fuentes`).substring(0, 500) || null,
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
      title: decision.title || 'Caso: Investigación en desarrollo',
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

  // No fallback — better 1-2 quality AI-curated cases than 3 raw headlines
}
