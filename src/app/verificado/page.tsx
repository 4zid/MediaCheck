'use client';

import { AppNav } from '@/components/AppNav';
import { NewsBlock } from '@/components/NewsBlock';
import { useClaims } from '@/hooks/useClaims';
import type { NewsStatus } from '@/app/api/news/route';
import type { VerdictType } from '@/lib/types';

function Skeleton() {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800/80 px-5 py-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-800 rounded ml-auto" />
      </div>
      <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded mb-1.5" />
      <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
    </div>
  );
}

function verdictToStatus(verdict: VerdictType): NewsStatus {
  switch (verdict) {
    case 'verified': return 'verdadero';
    case 'false': return 'fake';
    case 'partially_true': return 'chequeado';
    case 'misleading': return 'chequeado';
    case 'unverified': return 'estimacion';
    default: return 'sin-verificar';
  }
}

export default function VerificadoPage() {
  const { claims, loading } = useClaims({ limit: 50 });

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <AppNav />

      <main className="max-w-2xl mx-auto">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <p className="text-4xl mb-4">🛡️</p>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              Sin verificaciones aún
            </h2>
            <p className="text-sm text-gray-400">
              Las noticias verificadas aparecerán aquí automáticamente
            </p>
          </div>
        ) : (
          claims.map((claim) => (
            <NewsBlock
              key={claim.id}
              title={claim.content}
              source={claim.source_url
                ? new URL(claim.source_url).hostname.replace('www.', '')
                : 'MediaCheck'}
              pubDate={claim.created_at}
              link={claim.source_url ?? undefined}
              status={verdictToStatus(claim.verification.verdict)}
              confidence={claim.verification.confidence}
              category={claim.category}
            />
          ))
        )}
      </main>
    </div>
  );
}
