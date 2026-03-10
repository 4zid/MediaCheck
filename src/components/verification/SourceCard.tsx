'use client';

import { ExternalLink } from 'lucide-react';

interface SourceCardProps {
  url: string;
  title: string;
  snippet: string;
  credibility_score: number;
  supports_claim: boolean;
  source_name: string;
}

export function SourceCard({ url, title, snippet, credibility_score, supports_claim, source_name }: SourceCardProps) {
  return (
    <div className="border border-wire-border rounded-lg p-4 space-y-3 hover:border-wire-muted/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold tracking-[0.12em] text-wire-muted uppercase">
            {source_name}
          </span>
          <h4 className="text-sm text-white/90 leading-snug mt-0.5 line-clamp-2">
            {title}
          </h4>
        </div>
        <span className={`flex-shrink-0 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${
          supports_claim
            ? 'bg-green-900/40 text-green-400'
            : 'bg-red-900/40 text-red-400'
        }`}>
          {supports_claim ? 'APOYA' : 'CONTRADICE'}
        </span>
      </div>

      {/* Snippet */}
      {snippet && (
        <p className="text-xs text-wire-muted leading-relaxed line-clamp-3">
          {snippet}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Credibility bar */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] tracking-wider text-wire-muted/60 uppercase">Credibilidad</span>
          <div className="w-16 h-1 bg-surface-overlay rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                credibility_score >= 80 ? 'bg-green-500' :
                credibility_score >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${credibility_score}%` }}
            />
          </div>
          <span className="text-[10px] text-wire-muted">{credibility_score}</span>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-wire-muted/40 hover:text-white/60 transition-colors"
        >
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
