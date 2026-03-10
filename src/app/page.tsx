'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { ClaimTimeline } from '@/components/claims/ClaimTimeline';
import { useClaims } from '@/hooks/useClaims';
import { useRealtime } from '@/hooks/useRealtime';
import { VERDICT_CONFIG, type VerdictType } from '@/lib/types';
import Link from 'next/link';
import { Loader2, Send, Home, Hash, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [search, setSearch] = useState('');
  const [verdict, setVerdict] = useState<VerdictType | undefined>();
  const [seeding, setSeeding] = useState(false);
  const seededRef = useRef(false);

  const { claims, loading, refetch } = useClaims({ search, verdict });

  const handleRefetch = useCallback(() => refetch(), [refetch]);
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
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      {/* Mobile top header */}
      <Header />

      <div className="flex max-w-[1265px] mx-auto">
        {/* Left nav (desktop) */}
        <Sidebar />

        {/* Center feed */}
        <main className="flex-1 min-h-screen border-x border-gray-200 dark:border-gray-800 min-w-0">
          {/* Feed header */}
          <div className="sticky top-0 lg:top-0 z-10 bg-white/85 dark:bg-black/85 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
            <div className="px-4 py-3 flex items-center gap-2">
              <ShieldCheck size={22} className="text-indigo-500 lg:hidden" />
              <h1 className="text-xl font-bold">Verificaciones</h1>
            </div>

            {/* Verdict filter tabs */}
            <div className="flex overflow-x-auto scrollbar-none">
              <button
                onClick={() => setVerdict(undefined)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-w-[80px] ${
                  !verdict
                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                }`}
              >
                Todos
              </button>
              {(
                Object.entries(VERDICT_CONFIG) as [
                  VerdictType,
                  (typeof VERDICT_CONFIG)[VerdictType],
                ][]
              ).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setVerdict(verdict === key ? undefined : key)}
                  className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap min-w-[80px] px-1 ${
                    verdict === key
                      ? `border-indigo-500 ${config.color}`
                      : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                  }`}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Seeding banner */}
          {seeding && (
            <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/40 text-sm text-indigo-600 dark:text-indigo-300">
              <Loader2 size={14} className="animate-spin flex-shrink-0" />
              Verificando noticias recientes con IA...
            </div>
          )}

          {/* Timeline */}
          <ClaimTimeline claims={claims} loading={loading || seeding} />
        </main>

        {/* Right sidebar (desktop) */}
        <RightSidebar onSearch={setSearch} />
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 dark:bg-black/90 backdrop-blur border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-8 py-2 z-40 pb-safe">
        <Link href="/" className="flex flex-col items-center gap-0.5 p-2 text-indigo-500">
          <Home size={24} />
          <span className="text-[10px] font-medium">Inicio</span>
        </Link>
        <Link
          href="/submit"
          className="flex flex-col items-center gap-0.5 p-2 rounded-full bg-indigo-500 text-white px-5"
        >
          <Send size={22} />
        </Link>
        <Link href="/category/politics" className="flex flex-col items-center gap-0.5 p-2 text-gray-500">
          <Hash size={24} />
          <span className="text-[10px] font-medium">Explorar</span>
        </Link>
      </nav>

      {/* Bottom padding on mobile for nav bar */}
      <div className="lg:hidden h-20" />
    </div>
  );
}
