'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppNav } from '@/components/AppNav';
import { NewsBlock } from '@/components/NewsBlock';
import { Loader2 } from 'lucide-react';
import type { NewsItem } from '@/app/api/news/route';

function Skeleton() {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800/80 px-5 py-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-3 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-800 rounded ml-auto" />
      </div>
      <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded mb-1.5" />
      <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-800 rounded" />
    </div>
  );
}

export default function TendenciasPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const seededRef = useRef(false);

  const fetchPage = useCallback(async (off: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/news?limit=10&offset=${off}`);
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

  // Initial load
  useEffect(() => {
    fetchPage(0, false);
  }, [fetchPage]);

  // Auto-seed once on first load
  useEffect(() => {
    if (!loading && !seededRef.current) {
      seededRef.current = true;
      setSeeding(true);
      fetch('/api/auto-verify', { method: 'POST' })
        .then(() => fetchPage(0, false))
        .catch(() => {})
        .finally(() => setSeeding(false));
    }
  }, [loading, fetchPage]);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <AppNav />

      <main className="max-w-2xl mx-auto">
        {/* Status bar */}
        {seeding && (
          <div className="flex items-center gap-2 px-5 py-3 text-xs text-indigo-600 dark:text-indigo-400 border-b border-gray-100 dark:border-gray-800">
            <Loader2 size={12} className="animate-spin" />
            Verificando noticias con IA en segundo plano...
          </div>
        )}

        {/* Feed */}
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} />)
          : items.map((item, i) => (
              <NewsBlock key={`${item.link}-${i}`} {...item} />
            ))}

        {/* Load more */}
        {!loading && hasMore && (
          <div className="py-8 flex justify-center">
            <button
              onClick={() => fetchPage(offset, true)}
              disabled={loadingMore}
              className="px-6 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Cargando...
                </span>
              ) : (
                'Ver 10 más'
              )}
            </button>
          </div>
        )}

        {!loading && !hasMore && items.length > 0 && (
          <p className="text-center py-8 text-xs text-gray-400">
            · Fin del feed ·
          </p>
        )}
      </main>
    </div>
  );
}
