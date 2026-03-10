'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { ClaimTimeline } from '@/components/claims/ClaimTimeline';
import { TrendingFeed } from '@/components/claims/TrendingFeed';
import { useClaims } from '@/hooks/useClaims';
import { useRealtime } from '@/hooks/useRealtime';
import type { VerdictType } from '@/lib/types';
import Link from 'next/link';
import { Plus, Loader2 } from 'lucide-react';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [verdict, setVerdict] = useState<VerdictType | undefined>();
  const [dateRange] = useState('all');
  const [seeding, setSeeding] = useState(false);
  const seededRef = useRef(false);

  const { claims, loading, refetch } = useClaims({
    search,
    verdict,
    dateRange,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useRealtime('claims', handleRefetch);

  // Auto-seed trending news when timeline is empty
  useEffect(() => {
    if (!loading && claims.length === 0 && !seededRef.current) {
      seededRef.current = true;
      setSeeding(true);
      fetch('/api/auto-verify', { method: 'POST' })
        .then(() => refetch())
        .catch(() => {})
        .finally(() => setSeeding(false));
    }
  }, [loading, claims.length, refetch]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onSearch={setSearch}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          selectedVerdict={verdict}
          onVerdictChange={setVerdict}
        />

        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {/* Trending live RSS feed */}
          <TrendingFeed />

          {/* Verified timeline header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Verificaciones recientes
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Afirmaciones verificadas en tiempo real con inteligencia artificial
            </p>
          </div>

          {/* Mobile submit button */}
          <Link
            href="/submit"
            className="sm:hidden flex items-center justify-center gap-2 w-full mb-6 px-4 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            Verificar una afirmacion
          </Link>

          {/* Auto-seeding banner */}
          {seeding && (
            <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-700 dark:text-indigo-300">
              <Loader2 size={16} className="animate-spin flex-shrink-0" />
              Verificando noticias recientes con IA... esto puede tardar unos segundos.
            </div>
          )}

          {/* Timeline */}
          <ClaimTimeline claims={claims} loading={loading || seeding} />
        </main>
      </div>

      <Footer />
    </div>
  );
}
