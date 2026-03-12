'use client';

import { Masthead } from '@/components/layout/Masthead';
import { SlideOverPanel } from '@/components/layout/SlideOverPanel';
import { VerificationPanel } from '@/components/verification/VerificationPanel';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useClaims } from '@/hooks/useClaims';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import type { ClaimWithVerification, VerdictType } from '@/lib/types';

function ArchiveSkeleton() {
  return (
    <div className="px-5 py-4 border-b border-wire-border animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-surface-overlay" />
        <div className="h-2.5 w-14 bg-white dark:bg-surface-overlay rounded" />
        <div className="h-2.5 w-20 bg-white dark:bg-surface-overlay rounded ml-auto" />
      </div>
      <div className="h-5 w-full bg-white dark:bg-surface-overlay rounded mb-1.5" />
      <div className="h-5 w-3/4 bg-white dark:bg-surface-overlay rounded" />
    </div>
  );
}

export default function VerificadoPage() {
  const { claims, loading } = useClaims({ limit: 50 });
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithVerification | null>(null);

  return (
    <div className="min-h-screen bg-white dark:bg-surface">
      <Masthead />

      <main className="max-w-5xl mx-auto">
        {/* Archive header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-wire-border">
          <span className="text-xs font-bold tracking-[0.2em] text-wire-muted uppercase">
            Archivo de verificaciones
          </span>
          <div className="flex-1 h-px bg-wire-border" />
          <span className="text-[10px] text-wire-muted tracking-wider">
            {claims.length} resultados
          </span>
        </div>

        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <ArchiveSkeleton key={i} />)
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <h2 className="font-headline text-xl text-fg/80 mb-2">
              Sin verificaciones aún
            </h2>
            <p className="text-sm text-wire-muted">
              Las noticias verificadas aparecerán aquí
            </p>
          </div>
        ) : (
          claims.map((claim) => {
            let timeAgo = '';
            try {
              timeAgo = formatDistanceToNow(new Date(claim.created_at), { locale: es, addSuffix: true });
            } catch { /* ignore */ }

            return (
              <article
                key={claim.id}
                onClick={() => setSelectedClaim(claim)}
                className="group px-5 py-4 border-b border-wire-border hover:bg-white dark:bg-surface-overlay/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <StatusIndicator status={claim.verification.verdict as VerdictType} />
                  <span className="text-[11px] font-bold tracking-[0.12em] text-wire-muted uppercase">
                    {claim.source_url
                      ? new URL(claim.source_url).hostname.replace('www.', '')
                      : 'MediaCheck'}
                  </span>
                  {timeAgo && (
                    <>
                      <span className="text-wire-muted/40 text-[10px]">/</span>
                      <span className="text-[10px] text-wire-muted/60">{timeAgo}</span>
                    </>
                  )}
                  <span className="ml-auto text-[10px] font-bold tracking-wider text-wire-muted uppercase">
                    {claim.verification.confidence}%
                  </span>
                </div>
                <h3 className="font-headline text-lg leading-snug text-fg/90 group-hover:text-fg transition-colors">
                  {claim.content}
                </h3>
                <p className="mt-1.5 text-xs text-wire-muted line-clamp-1">
                  {claim.verification.summary}
                </p>
              </article>
            );
          })
        )}
      </main>

      <SlideOverPanel
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
      >
        {selectedClaim && (
          <VerificationPanel
            title={selectedClaim.content}
            source={
              selectedClaim.source_url
                ? new URL(selectedClaim.source_url).hostname.replace('www.', '')
                : 'MediaCheck'
            }
            link={selectedClaim.source_url || ''}
          />
        )}
      </SlideOverPanel>
    </div>
  );
}
