'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, ExternalLink, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { VerdictBadge } from './VerdictBadge';
import { SourcesList } from './SourcesList';
import { CATEGORIES, type ClaimWithVerification } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface ClaimCardProps {
  claim: ClaimWithVerification;
}

export function ClaimCard({ claim }: ClaimCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { verification } = claim;
  const category = CATEGORIES.find((c) => c.value === claim.category);

  return (
    <Card className="p-4 sm:p-5 animate-slide-up">
      {/* Top row: verdict + category + time */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <VerdictBadge verdict={verification.verdict} />
          {category && (
            <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {category.emoji} {category.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
          <Clock size={12} />
          {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true, locale: es })}
        </div>
      </div>

      {/* Claim content */}
      <p className="text-gray-800 dark:text-gray-200 text-sm sm:text-base leading-relaxed mb-3">
        {claim.content}
      </p>

      {/* Confidence bar */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">Confianza</span>
        <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              verification.confidence >= 75 ? 'bg-emerald-500' :
              verification.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${verification.confidence}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {verification.confidence}%
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {verification.summary}
      </p>

      {/* Expandable analysis */}
      {expanded && (
        <div className="mb-3 animate-fade-in">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <FileText size={14} />
              Analisis detallado
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
              {verification.analysis}
            </div>
          </div>

          {/* Sources */}
          {verification.sources && verification.sources.length > 0 && (
            <SourcesList sources={verification.sources} collapsed={false} />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp size={16} />
              Menos detalles
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Ver analisis completo
            </>
          )}
        </button>

        <div className="flex items-center gap-3">
          {claim.source_url && (
            <a
              href={claim.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <ExternalLink size={12} />
              Fuente original
            </a>
          )}
          <Link
            href={`/claim/${claim.id}`}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Permalink
          </Link>
        </div>
      </div>
    </Card>
  );
}
