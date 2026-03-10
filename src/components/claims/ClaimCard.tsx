'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExternalLink, MessageSquare, Share2, ShieldCheck } from 'lucide-react';
import { VerdictBadge } from './VerdictBadge';
import { SourcesList } from './SourcesList';
import { CATEGORIES, type ClaimWithVerification } from '@/lib/types';

interface ClaimCardProps {
  claim: ClaimWithVerification;
}

export function ClaimCard({ claim }: ClaimCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { verification } = claim;
  const category = CATEGORIES.find((c) => c.value === claim.category);

  return (
    <article className="flex gap-3 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors border-b border-gray-100 dark:border-gray-800/80">
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-lg select-none">
          {category?.emoji ?? '📰'}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className="font-bold text-sm text-gray-900 dark:text-white">MediaCheck</span>
          <ShieldCheck size={13} className="text-indigo-500" />
          {category && (
            <span className="text-gray-500 text-sm">· {category.label}</span>
          )}
          <span className="text-gray-400 text-sm">
            · {formatDistanceToNow(new Date(claim.created_at), { locale: es })}
          </span>
          <div className="ml-auto">
            <VerdictBadge verdict={verification.verdict} size="sm" />
          </div>
        </div>

        {/* Claim text */}
        <p className="text-[15px] leading-normal text-gray-900 dark:text-gray-100 mb-2.5">
          {claim.content}
        </p>

        {/* Confidence bar */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                verification.confidence >= 75
                  ? 'bg-emerald-500'
                  : verification.confidence >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${verification.confidence}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400 w-9 text-right">
            {verification.confidence}%
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-2.5">
          {verification.summary}
        </p>

        {/* Expandable analysis */}
        {expanded && (
          <div className="mb-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 animate-fade-in">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {verification.analysis}
            </p>
            {verification.sources && verification.sources.length > 0 && (
              <SourcesList sources={verification.sources} collapsed={false} />
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1 -ml-2 text-gray-400">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-500 transition-colors text-sm group"
          >
            <MessageSquare size={16} />
            <span className="text-xs">{expanded ? 'Cerrar' : 'Análisis'}</span>
          </button>

          {claim.source_url && (
            <a
              href={claim.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-500 transition-colors group"
            >
              <ExternalLink size={16} />
              <span className="text-xs">Fuente</span>
            </a>
          )}

          <Link
            href={`/claim/${claim.id}`}
            className="flex items-center px-2 py-1.5 rounded-full hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-500 transition-colors ml-auto"
          >
            <Share2 size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
