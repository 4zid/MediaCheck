'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { VerdictType } from '@/lib/types';

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  verified: { bg: 'bg-status-verified/15', text: 'text-green-400', label: 'VERIFICADO' },
  partially_true: { bg: 'bg-amber-600/15', text: 'text-amber-400', label: 'PARCIALMENTE CIERTO' },
  false: { bg: 'bg-status-false/15', text: 'text-red-400', label: 'FALSO' },
  unverified: { bg: 'bg-gray-600/15', text: 'text-gray-400', label: 'NO VERIFICADO' },
  misleading: { bg: 'bg-status-misleading/15', text: 'text-orange-400', label: 'ENGAÑOSO' },
};

interface VerdictDisplayProps {
  verdict: VerdictType | string;
  confidence: number;
  summary: string;
  analysis: string;
}

export function VerdictDisplay({ verdict, confidence, summary, analysis }: VerdictDisplayProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const style = VERDICT_STYLES[verdict] || VERDICT_STYLES.unverified;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Verdict badge */}
      <div className={`${style.bg} rounded-lg px-5 py-4`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm font-bold tracking-[0.15em] ${style.text}`}>
            {style.label}
          </span>
        </div>

        {/* Confidence meter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-wider text-wire-muted uppercase">Confianza</span>
            <span className={`text-sm font-bold ${style.text}`}>{confidence}%</span>
          </div>
          <div className="h-1 bg-black/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full animate-meter-fill ${
                verdict === 'verified' ? 'bg-green-500' :
                verdict === 'false' ? 'bg-red-500' :
                verdict === 'misleading' ? 'bg-orange-500' :
                'bg-amber-500'
              }`}
              style={{ '--meter-value': `${confidence}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-fg/80 leading-relaxed">
        {summary}
      </p>

      {/* Detailed analysis (collapsible) */}
      <button
        onClick={() => setShowAnalysis(!showAnalysis)}
        className="flex items-center gap-1.5 text-[11px] tracking-wider text-wire-muted hover:text-fg/70 uppercase transition-colors"
      >
        {showAnalysis ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Análisis detallado
      </button>

      {showAnalysis && (
        <div className="text-sm text-fg/60 leading-relaxed whitespace-pre-line border-l-2 border-wire-border pl-4 animate-fade-in">
          {analysis}
        </div>
      )}
    </div>
  );
}
