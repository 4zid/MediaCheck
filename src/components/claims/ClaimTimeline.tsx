'use client';

import { ClaimCard } from './ClaimCard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ClaimWithVerification } from '@/lib/types';
import { ShieldAlert } from 'lucide-react';

interface ClaimTimelineProps {
  claims: ClaimWithVerification[];
  loading?: boolean;
}

export function ClaimTimeline({ claims, loading }: ClaimTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="w-24 h-6" />
              <Skeleton className="w-16 h-6" />
            </div>
            <Skeleton className="w-full h-4 mb-2" />
            <Skeleton className="w-3/4 h-4 mb-3" />
            <Skeleton className="w-full h-2 mb-3" />
            <Skeleton className="w-2/3 h-4" />
          </div>
        ))}
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="text-center py-16">
        <ShieldAlert className="mx-auto text-gray-300 dark:text-gray-700 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
          No hay verificaciones aun
        </h3>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Se el primero en enviar un claim para verificar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <ClaimCard key={claim.id} claim={claim} />
      ))}
    </div>
  );
}
