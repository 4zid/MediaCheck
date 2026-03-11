import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { searchSources } from './feeds';
import { searchWikipedia } from './wikipedia';
import { searchContextualSources } from './contextual';
import { classifyWithHaiku, factCheck } from './claude';
import { getCredibilityScore, getSourceName } from './sources';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('placeholder') || url.includes('your-project')) return null;
  return createClient(url, key);
}

export interface Investigation {
  id: string;
  title: string;
  summary: string | null;
  status: 'active' | 'resolved' | 'dismissed';
  verdict: string | null;
  confidence: number;
  category: string;
  manual_recheck_used: boolean;
  source_count: number;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestigationSource {
  id: string;
  investigation_id: string;
  url: string;
  title: string | null;
  snippet: string | null;
  content: string | null;
  credibility_score: number;
  supports_claim: boolean | null;
  source_name: string | null;
  source_type: string | null;
  published_at: string | null;
  accessed_at: string;
}

export interface InvestigationCheck {
  id: string;
  investigation_id: string;
  verdict: string | null;
  confidence: number | null;
  summary: string | null;
  analysis: string | null;
  sources_added: number;
  ai_model: string;
  created_at: string;
}

/**
 * Detect trending topics and create investigation cases (max 3 active).
 */
export async function detectAndCreateCases(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  // Get active investigations
  const { data: active } = await supabase
    .from('investigations')
    .select('id, title, status, created_at, last_checked_at, verdict')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const activeInvestigations = active || [];

  // Auto-resolve old cases with a verdict and >24h without new sources
  for (const inv of activeInvestigations) {
    if (inv.verdict && inv.last_checked_at) {
      const hoursSinceCheck = (Date.now() - new Date(inv.last_checked_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCheck > 24) {
        await supabase.from('investigations').update({ status: 'resolved', updated_at: new Date().toISOString() }).eq('id', inv.id);
      }
    }
  }

  // Re-count active after resolving
  const { data: stillActive } = await supabase
    .from('investigations')
    .select('id, title')
    .eq('status', 'active');

  const currentActive = stillActive || [];
  if (currentActive.length >= 3) return;

  // Fetch trending news
  const trendingSources = await searchSources('breaking news trending').catch(() => []);
  if (trendingSources.length === 0) return;

  // Use Haiku to identify most important topics
  const topicPrompt = trendingSources.slice(0, 10).map((s, i) => `${i + 1}. ${s.title}`).join('\n');

  const classification = await classifyWithHaiku(
    `Identifica los ${3 - currentActive.length} temas más importantes de estas noticias:\n${topicPrompt}`
  );

  if (!classification) return;

  // Create cases for new topics (simplified: use top sources as cases)
  const slotsAvailable = 3 - currentActive.length;
  const existingTitles = currentActive.map(i => i.title.toLowerCase());

  for (const source of trendingSources.slice(0, slotsAvailable)) {
    // Skip if too similar to existing case
    const isDuplicate = existingTitles.some(t =>
      source.title.toLowerCase().includes(t) || t.includes(source.title.toLowerCase().substring(0, 20))
    );
    if (isDuplicate) continue;

    await supabase.from('investigations').insert({
      title: source.title.substring(0, 200),
      summary: source.content.substring(0, 500) || null,
      status: 'active',
      category: classification.category || 'other',
      source_count: 0,
    });
  }
}

/**
 * Re-investigate a case: search for new sources, run analysis, update verdict.
 */
export async function recheckInvestigation(investigationId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  // Load case
  const { data: investigation } = await supabase
    .from('investigations')
    .select('*')
    .eq('id', investigationId)
    .single();

  if (!investigation) return;

  // Load existing sources
  const { data: existingSources } = await supabase
    .from('investigation_sources')
    .select('url, title, snippet, content, credibility_score, supports_claim')
    .eq('investigation_id', investigationId);

  const existing = existingSources || [];
  const existingUrls = new Set(existing.map(s => s.url));

  // Search for new sources
  const [feedSources, wikiResults, contextualResults] = await Promise.all([
    searchSources(investigation.title).catch(() => []),
    searchWikipedia(investigation.title).catch(() => []),
    searchContextualSources(investigation.category || 'other', 'medium', investigation.title).catch(() => []),
  ]);

  const wikiSources = wikiResults.map(w => ({
    title: w.title,
    url: `https://es.wikipedia.org/wiki/${encodeURIComponent(w.title)}`,
    content: w.extract,
    date: undefined as string | undefined,
    source_type: 'wikipedia',
  }));

  const allNewSources = [
    ...feedSources.map(s => ({ ...s, source_type: 'rss' })),
    ...wikiSources,
    ...contextualResults.map(s => ({ ...s, source_type: 'contextual' })),
  ].filter(s => !existingUrls.has(s.url));

  // Insert new sources (UNIQUE constraint prevents duplicates)
  let sourcesAdded = 0;
  for (const source of allNewSources) {
    const { error } = await supabase.from('investigation_sources').insert({
      investigation_id: investigationId,
      url: source.url,
      title: source.title,
      snippet: source.content?.substring(0, 300) || null,
      content: source.content || null,
      credibility_score: getCredibilityScore(source.url),
      source_name: getSourceName(source.url),
      source_type: source.source_type,
      published_at: source.date || null,
    });
    if (!error) sourcesAdded++;
  }

  // Reload all sources for analysis
  const { data: allSources } = await supabase
    .from('investigation_sources')
    .select('*')
    .eq('investigation_id', investigationId);

  const sourcesForAnalysis = (allSources || []).map(s => ({
    title: s.title || '',
    url: s.url,
    content: s.snippet || s.content || '',
    date: s.published_at || undefined,
  }));

  // Run Sonnet analysis with ALL accumulated sources
  const result = await factCheck(investigation.title, sourcesForAnalysis);

  // Update investigation
  await supabase.from('investigations').update({
    verdict: result.verdict,
    confidence: result.confidence,
    summary: result.summary,
    source_count: (allSources || []).length,
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', investigationId);

  // Insert check record
  await supabase.from('investigation_checks').insert({
    investigation_id: investigationId,
    verdict: result.verdict,
    confidence: result.confidence,
    summary: result.summary,
    analysis: result.analysis,
    sources_added: sourcesAdded,
  });
}

/**
 * Get active investigations with their sources and latest check.
 */
export async function getActiveInvestigations(): Promise<(Investigation & { sources: InvestigationSource[]; checks: InvestigationCheck[] })[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from('investigations')
    .select(`
      *,
      investigation_sources (*),
      investigation_checks (*)
    `)
    .in('status', ['active', 'resolved'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (!data) return [];

  return data.map(inv => ({
    ...inv,
    sources: inv.investigation_sources || [],
    checks: (inv.investigation_checks || []).sort(
      (a: InvestigationCheck, b: InvestigationCheck) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }));
}
