'use client';

import { useState, useEffect, useCallback } from 'react';
import { Masthead } from '@/components/layout/Masthead';
import { SlideOverPanel } from '@/components/layout/SlideOverPanel';
import { SourceFilter } from '@/components/feed/SourceFilter';
import { WireItem } from '@/components/feed/WireItem';
import { WireItemSkeleton } from '@/components/feed/WireItemSkeleton';
import { CaseCard } from '@/components/investigations/CaseCard';
import { CaseDetail } from '@/components/investigations/CaseDetail';
import { VerificationPanel } from '@/components/verification/VerificationPanel';
import { EconomicBadge } from '@/components/argentina/EconomicBadge';
import { Loader2, Radio, Search } from 'lucide-react';
import type { NewsItem } from '@/app/api/news/route';

interface Investigation {
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
  sources: Array<{
    id: string;
    url: string;
    title: string | null;
    snippet: string | null;
    credibility_score: number;
    supports_claim: boolean | null;
    source_name: string | null;
    source_type: string | null;
    published_at: string | null;
  }>;
  checks: Array<{
    id: string;
    verdict: string | null;
    confidence: number | null;
    summary: string | null;
    analysis: string | null;
    sources_added: number;
    created_at: string;
  }>;
}

interface SelectedNews {
  title: string;
  source: string;
  link: string;
}

export default function HomePage() {
  // Investigations state
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);

  // News feed state
  const [items, setItems] = useState<NewsItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeSource, setActiveSource] = useState('all');
  const [selectedNews, setSelectedNews] = useState<SelectedNews | null>(null);

  // Fetch investigations
  useEffect(() => {
    fetch('/api/investigations')
      .then(res => res.json())
      .then(data => setInvestigations(data.investigations || []))
      .catch(() => {});
  }, []);

  // Fetch news — routes to /api/argentina/feed when Argentina is selected
  const fetchPage = useCallback(async (off: number, append: boolean, source?: string) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const isArgentina = source?.startsWith('ar-');
      const params = new URLSearchParams({ limit: '10', offset: String(off) });

      let url: string;
      if (isArgentina) {
        const arCategory = source === 'ar-all' ? 'all' : source!.replace('ar-', '');
        params.set('category', arCategory);
        url = `/api/argentina/feed?${params}`;
      } else {
        if (source && source !== 'all') params.set('source', source);
        url = `/api/news?${params}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(prev => (append ? [...prev, ...data.items] : data.items || []));
      setHasMore(data.hasMore ?? false);
      setOffset(off + 10);
    } catch (err) {
      console.error('Failed to fetch news:', err);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(0, false, activeSource);
  }, [fetchPage, activeSource]);

  const handleSourceChange = (source: string) => {
    setActiveSource(source);
    setOffset(0);
  };

  const handleRecheck = async (id: string) => {
    setRecheckingId(id);
    try {
      await fetch(`/api/investigations/${id}/recheck`, { method: 'POST' });
      // Refresh investigations
      const res = await fetch('/api/investigations');
      const data = await res.json();
      setInvestigations(data.investigations || []);
    } catch (err) {
      console.error('Recheck failed:', err);
    } finally {
      setRecheckingId(null);
    }
  };

  const handleSelectInvestigation = (id: string) => {
    const inv = investigations.find(i => i.id === id);
    if (inv) setSelectedInvestigation(inv);
  };

  const activeInvestigations = investigations.filter(i => i.status === 'active').slice(0, 3);
  const isArgentinaMode = activeSource.startsWith('ar-');

  return (
    <div className="min-h-screen bg-surface bg-ambient">
      <Masthead />

      <main className="relative z-10 max-w-6xl mx-auto px-5">
        {/* Investigation Cases */}
        {activeInvestigations.length > 0 && (
          <section className="pt-8 pb-6">
            <div className="flex items-center gap-2.5 mb-5">
              <Search size={13} className="text-accent/50" />
              <span className="section-label text-accent/50">Investigaciones activas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeInvestigations.map((inv, i) => (
                <div
                  key={inv.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
                >
                  <CaseCard
                    investigation={{
                      ...inv,
                      manual_recheck_used: inv.manual_recheck_used || recheckingId === inv.id,
                    }}
                    onRecheck={handleRecheck}
                    onSelect={handleSelectInvestigation}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state for no investigations */}
        {activeInvestigations.length === 0 && (
          <section className="pt-8 pb-6">
            <div className="glass p-8 text-center">
              <Search size={20} className="mx-auto mb-3 text-fg/10" />
              <p className="text-sm text-fg/25">
                No hay investigaciones activas. Se crearán automáticamente al detectar noticias relevantes.
              </p>
            </div>
          </section>
        )}

        {/* Divider */}
        <div className="h-px bg-fg/[0.04] my-2" />

        {/* News Feed */}
        <section className="pb-12">
          <div className="flex items-center gap-2.5 px-0 py-5">
            <Radio size={12} className="text-fg/20" />
            <span className="section-label">Feed en vivo</span>
          </div>

          <SourceFilter activeSource={activeSource} onSourceChange={handleSourceChange} />

          {/* Economic badge when Argentina is active */}
          {isArgentinaMode && (
            <div className="py-3">
              <EconomicBadge />
            </div>
          )}

          <div className="mt-1">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <WireItemSkeleton key={i} />)
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-fg/20">No hay noticias disponibles</p>
              </div>
            ) : (
              items.map((item, i) => (
                <WireItem
                  key={`${item.link}-${i}`}
                  title={item.title}
                  source={item.source}
                  pubDate={item.pubDate}
                  link={item.link}
                  onClick={() => setSelectedNews({
                    title: item.title,
                    source: item.source,
                    link: item.link,
                  })}
                  style={{ animationDelay: `${i * 20}ms` }}
                />
              ))
            )}

            {/* Load more */}
            {!loading && hasMore && (
              <div className="py-8 flex justify-center">
                <button
                  onClick={() => fetchPage(offset, true, activeSource)}
                  disabled={loadingMore}
                  className="px-5 py-2 rounded-xl glass glass-hover text-[11px] tracking-wider font-medium text-fg/30 hover:text-fg/60 uppercase transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={11} className="animate-spin" /> Cargando...
                    </span>
                  ) : (
                    'Cargar más'
                  )}
                </button>
              </div>
            )}

            {!loading && !hasMore && items.length > 0 && (
              <p className="text-center py-8 text-[10px] tracking-[0.2em] text-fg/10 uppercase">
                Fin del feed
              </p>
            )}
          </div>
        </section>
      </main>

      {/* Investigation detail panel */}
      <SlideOverPanel
        isOpen={!!selectedInvestigation}
        onClose={() => setSelectedInvestigation(null)}
      >
        {selectedInvestigation && (
          <CaseDetail investigation={selectedInvestigation} />
        )}
      </SlideOverPanel>

      {/* News verification panel */}
      <SlideOverPanel
        isOpen={!!selectedNews}
        onClose={() => setSelectedNews(null)}
      >
        {selectedNews && (
          <VerificationPanel
            title={selectedNews.title}
            source={selectedNews.source}
            link={selectedNews.link}
          />
        )}
      </SlideOverPanel>
    </div>
  );
}
