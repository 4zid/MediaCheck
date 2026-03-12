'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { ClaimTimeline } from '@/components/claims/ClaimTimeline';
import { useClaims } from '@/hooks/useClaims';
import { useRealtime } from '@/hooks/useRealtime';
import { CATEGORIES, VERDICT_CONFIG, type ClaimCategory, type VerdictType } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as ClaimCategory;
  const category = CATEGORIES.find((c) => c.value === slug);

  const [search, setSearch] = useState('');
  const [verdict, setVerdict] = useState<VerdictType | undefined>();

  const { claims, loading, refetch } = useClaims({ category: slug, search, verdict });

  const handleRefetch = useCallback(() => refetch(), [refetch]);
  useRealtime('claims', handleRefetch);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <Header />

      <div className="flex max-w-[1265px] mx-auto">
        <Sidebar />

        <main className="flex-1 min-h-screen border-x border-gray-200 dark:border-gray-800 min-w-0">
          {/* Feed header */}
          <div className="sticky top-0 z-10 bg-fg/85 dark:bg-black/85 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
            <div className="px-4 py-3 flex items-center gap-3">
              <Link href="/" className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold">
                  {category ? `${category.emoji} ${category.label}` : slug}
                </h1>
                <p className="text-xs text-gray-500">Verificaciones</p>
              </div>
              <ShieldCheck size={18} className="text-indigo-500 lg:hidden ml-auto" />
            </div>

            {/* Verdict filter tabs */}
            <div className="flex overflow-x-auto scrollbar-none">
              <button
                onClick={() => setVerdict(undefined)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-w-[80px] ${
                  !verdict ? 'border-indigo-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                }`}
              >
                Todos
              </button>
              {(Object.entries(VERDICT_CONFIG) as [VerdictType, (typeof VERDICT_CONFIG)[VerdictType]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setVerdict(verdict === key ? undefined : key)}
                  className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap min-w-[80px] px-1 ${
                    verdict === key ? `border-indigo-500 ${config.color}` : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                  }`}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
          </div>

          <ClaimTimeline claims={claims} loading={loading} />
        </main>

        <RightSidebar onSearch={setSearch} />
      </div>
    </div>
  );
}
