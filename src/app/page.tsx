'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { ClaimTimeline } from '@/components/claims/ClaimTimeline';
import { useClaims } from '@/hooks/useClaims';
import { useRealtime } from '@/hooks/useRealtime';
import type { VerdictType } from '@/lib/types';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [verdict, setVerdict] = useState<VerdictType | undefined>();
  const [dateRange] = useState('all');

  const { claims, loading, refetch } = useClaims({
    search,
    verdict,
    dateRange,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useRealtime('claims', handleRefetch);

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
          {/* Hero section */}
          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
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

          {/* Timeline */}
          <ClaimTimeline claims={claims} loading={loading} />
        </main>
      </div>

      <Footer />
    </div>
  );
}
