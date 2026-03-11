'use client';

import { ExternalLink } from 'lucide-react';

interface SourceCardProps {
  url: string;
  title: string;
  snippet: string;
  credibility_score: number;
  supports_claim: boolean | null;
  source_name: string;
}

export function SourceCard({ url, title, snippet, credibility_score, supports_claim, source_name }: SourceCardProps) {
  return (
    <div className="glass p-4 space-y-3 glass-hover">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-medium tracking-[0.12em] text-white/25 uppercase">
            {source_name}
          </span>
          <h4 className="text-sm text-white/80 leading-snug mt-0.5 line-clamp-2">
            {title}
          </h4>
        </div>
        {supports_claim !== null && supports_claim !== undefined && (
          <span className={`flex-shrink-0 text-[10px] font-medium tracking-wider px-2 py-0.5 rounded-md ${
            supports_claim
              ? 'bg-emerald-500/10 text-emerald-400/70'
              : 'bg-red-500/10 text-red-400/70'
          }`}>
            {supports_claim ? 'APOYA' : 'CONTRADICE'}
          </span>
        )}
      </div>

      {/* Snippet */}
      {snippet && (
        <p className="text-xs text-white/30 leading-relaxed line-clamp-3">
          {snippet}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Credibility bar */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] tracking-wider text-white/15 uppercase">Credibilidad</span>
          <div className="w-16 h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                credibility_score >= 80 ? 'bg-emerald-500' :
                credibility_score >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${credibility_score}%` }}
            />
          </div>
          <span className="text-[10px] text-white/20 tabular-nums">{credibility_score}</span>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/15 hover:text-accent/60 transition-colors"
        >
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
