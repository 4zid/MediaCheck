'use client';

import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import type { VerificationSource } from '@/lib/types';

interface SourcesListProps {
  sources: VerificationSource[];
  collapsed?: boolean;
}

export function SourcesList({ sources, collapsed = true }: SourcesListProps) {
  const [expanded, setExpanded] = useState(!collapsed);

  if (sources.length === 0) return null;

  const supportCount = sources.filter((s) => s.supports_claim).length;
  const againstCount = sources.filter((s) => !s.supports_claim).length;

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <span className="font-medium">{sources.length} fuentes consultadas</span>
        <span className="text-xs">
          ({supportCount} apoyan, {againstCount} contradicen)
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 animate-fade-in">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
            >
              <div className="mt-0.5">
                {source.supports_claim ? (
                  <CheckCircle size={16} className="text-emerald-500" />
                ) : (
                  <XCircle size={16} className="text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                  >
                    {source.title || source.source_name || 'Fuente'}
                  </a>
                  <ExternalLink size={12} className="text-gray-400 flex-shrink-0" />
                </div>
                {source.snippet && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {source.snippet}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-gray-400">
                    {source.source_name}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          source.credibility_score >= 75 ? 'bg-emerald-500' :
                          source.credibility_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${source.credibility_score}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{source.credibility_score}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
