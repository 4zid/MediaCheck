'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { ClaimTimeline } from '@/components/claims/ClaimTimeline';
import { useClaims } from '@/hooks/useClaims';
import { useRealtime } from '@/hooks/useRealtime';
import { CATEGORIES, type ClaimCategory, type VerdictType } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as ClaimCategory;
  const category = CATEGORIES.find((c) => c.value === slug);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [verdict, setVerdict] = useState<VerdictType | undefined>();

  const { claims, loading, refetch } = useClaims({
    category: slug,
    search,
    verdict,
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
          selectedCategory={slug}
          selectedVerdict={verdict}
          onVerdictChange={setVerdict}
        />

        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Todas las categorias
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {category ? `${category.emoji} ${category.label}` : slug}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Verificaciones en la categoria de {category?.label.toLowerCase() || slug}
            </p>
          </div>

          <ClaimTimeline claims={claims} loading={loading} />
        </main>
      </div>

      <Footer />
    </div>
  );
}
