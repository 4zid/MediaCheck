'use client';

import { useState, useEffect, useCallback } from 'react';
import { Masthead } from '@/components/layout/Masthead';
import { SlideOverPanel } from '@/components/layout/SlideOverPanel';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { SourceFilter } from '@/components/feed/SourceFilter';
import { WireItem } from '@/components/feed/WireItem';
import { WireItemSkeleton } from '@/components/feed/WireItemSkeleton';
import { VerificationPanel } from '@/components/verification/VerificationPanel';
import { Loader2 } from 'lucide-react';
import type { NewsItem } from '@/app/api/news/route';
import type { VerdictType } from '@/lib/types';

interface SelectedItem {
  title: string;
  source: string;
  link: string;
}

export default function HomePage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeSource, setActiveSource] = useState('all');
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [verifiedUrls] = useState<Map<string, VerdictType>>(new Map());

  const fetchPage = useCallback(async (off: number, append: boolean, source?: string) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ limit: '10', offset: String(off) });
      if (source && source !== 'all') params.set('source', source);

      const res = await fetch(`/api/news?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems((prev) => (append ? [...prev, ...data.items] : data.items || []));
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

  const handleItemClick = (item: NewsItem) => {
    setSelectedItem({
      title: item.title,
      source: item.source,
      link: item.link,
    });
  };

  const getItemVerificationStatus = (link: string): VerdictType | 'sin-verificar' => {
    return verifiedUrls.get(link) || 'sin-verificar';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-surface">
      <Masthead />

      <main className="max-w-5xl mx-auto">
        <div className="flex">
          {/* News wire column */}
          <div className="flex-1 min-w-0">
            <FeedHeader />
            <SourceFilter activeSource={activeSource} onSourceChange={handleSourceChange} />

            {/* Feed */}
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <WireItemSkeleton key={i} />)
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <p className="text-wire-muted text-sm">No hay noticias disponibles</p>
              </div>
            ) : (
              items.map((item, i) => (
                <WireItem
                  key={`${item.link}-${i}`}
                  title={item.title}
                  source={item.source}
                  pubDate={item.pubDate}
                  link={item.link}
                  verificationStatus={getItemVerificationStatus(item.link)}
                  onClick={() => handleItemClick(item)}
                  style={{ animationDelay: `${i * 30}ms` }}
                />
              ))
            )}

            {/* Load more */}
            {!loading && hasMore && (
              <div className="py-8 flex justify-center">
                <button
                  onClick={() => fetchPage(offset, true, activeSource)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-full border border-wire-border text-[11px] tracking-[0.15em] font-bold text-wire-muted hover:text-white hover:border-wire-muted uppercase transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" /> Cargando...
                    </span>
                  ) : (
                    'Cargar más'
                  )}
                </button>
              </div>
            )}

            {!loading && !hasMore && items.length > 0 && (
              <p className="text-center py-8 text-[10px] tracking-[0.2em] text-wire-muted/40 uppercase">
                Fin del wire
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Verification slide-over panel */}
      <SlideOverPanel
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <VerificationPanel
            title={selectedItem.title}
            source={selectedItem.source}
            link={selectedItem.link}
          />
        )}
      </SlideOverPanel>
    </div>
  );
}
