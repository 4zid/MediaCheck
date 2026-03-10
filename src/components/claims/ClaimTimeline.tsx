'use client';

import { ClaimCard } from './ClaimCard';
import type { ClaimWithVerification } from '@/lib/types';
import { ShieldAlert } from 'lucide-react';

interface ClaimTimelineProps {
  claims: ClaimWithVerification[];
  loading?: boolean;
}

export function ClaimTimeline({ claims, loading }: ClaimTimelineProps) {
  if (loading) {
    return (
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800/80 animate-pulse"
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="flex gap-2">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-16" />
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
              <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full w-full mt-1" />
              <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <ShieldAlert className="text-gray-300 dark:text-gray-700 mb-4" size={52} />
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          No hay verificaciones aún
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-[15px]">
          Las noticias del momento se verificarán automáticamente
        </p>
      </div>
    );
  }

  return (
    <div>
      {claims.map((claim) => (
        <ClaimCard key={claim.id} claim={claim} />
      ))}
    </div>
  );
}
