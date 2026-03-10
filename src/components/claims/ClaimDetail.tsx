'use client';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Clock, ExternalLink, Bot, FileText } from 'lucide-react';
import Link from 'next/link';
import { VerdictBadge } from './VerdictBadge';
import { SourcesList } from './SourcesList';
import { CATEGORIES, type ClaimWithVerification } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface ClaimDetailProps {
  claim: ClaimWithVerification;
}

export function ClaimDetail({ claim }: ClaimDetailProps) {
  const { verification } = claim;
  const category = CATEGORIES.find((c) => c.value === claim.category);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver al timeline
      </Link>

      <Card className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <VerdictBadge verdict={verification.verdict} size="lg" />
            {category && (
              <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {category.emoji} {category.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Clock size={14} />
            {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true, locale: es })}
          </div>
        </div>

        {/* Claim */}
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4 leading-relaxed">
          &ldquo;{claim.content}&rdquo;
        </h1>

        {claim.source_url && (
          <a
            href={claim.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6"
          >
            <ExternalLink size={14} />
            Ver fuente original
          </a>
        )}

        {/* Confidence */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Nivel de confianza</span>
            <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">{verification.confidence}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                verification.confidence >= 75 ? 'bg-emerald-500' :
                verification.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${verification.confidence}%` }}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 mb-6">
          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
            {verification.summary}
          </p>
        </div>

        {/* Analysis */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <FileText size={18} />
            Analisis detallado
          </h2>
          <div className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
            {verification.analysis}
          </div>
        </div>

        {/* AI model info */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <Bot size={14} />
          <span>Verificado con {verification.ai_model}</span>
        </div>

        {/* Sources */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Fuentes consultadas
          </h2>
          {verification.sources && verification.sources.length > 0 ? (
            <SourcesList sources={verification.sources} collapsed={false} />
          ) : (
            <p className="text-sm text-gray-400">No hay fuentes adicionales disponibles.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
