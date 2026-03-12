'use client';

import { Clock, ExternalLink, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Check {
  id: string;
  verdict: string | null;
  confidence: number | null;
  summary: string | null;
  analysis: string | null;
  sources_added: number;
  created_at: string;
}

interface Source {
  id: string;
  url: string;
  title: string | null;
  snippet: string | null;
  credibility_score: number;
  supports_claim: boolean | null;
  source_name: string | null;
  source_type: string | null;
  published_at: string | null;
}

interface CaseDetailProps {
  investigation: {
    id: string;
    title: string;
    summary: string | null;
    status: string;
    verdict: string | null;
    confidence: number;
    category: string;
    source_count: number;
    checks: Check[];
    sources: Source[];
  };
}

const VERDICT_LABELS: Record<string, { label: string; color: string }> = {
  verified: { label: 'Verificado', color: 'text-emerald-400' },
  partially_true: { label: 'Parcialmente cierto', color: 'text-amber-400' },
  false: { label: 'Falso', color: 'text-red-400' },
  misleading: { label: 'Engañoso', color: 'text-orange-400' },
  unverified: { label: 'Sin verificar', color: 'text-fg/40' },
};

function CredibilityDot({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-amber-400' : 'bg-red-400';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

function formatDate(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { locale: es, addSuffix: true });
  } catch {
    return '';
  }
}

export function CaseDetail({ investigation }: CaseDetailProps) {
  const currentVerdict = VERDICT_LABELS[investigation.verdict || 'unverified'] || VERDICT_LABELS.unverified;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-accent/70">
            {investigation.category}
          </span>
          <span className="text-fg/10">·</span>
          <span className={`text-xs font-medium ${currentVerdict.color}`}>
            {currentVerdict.label}
          </span>
          {investigation.confidence > 0 && (
            <>
              <span className="text-fg/10">·</span>
              <span className="text-[11px] text-fg/30 tabular-nums">{investigation.confidence}%</span>
            </>
          )}
        </div>

        <h2 className="font-headline text-xl font-bold leading-snug text-fg">
          {investigation.title}
        </h2>

        {investigation.summary && (
          <p className="text-sm text-fg/50 leading-relaxed">
            {investigation.summary}
          </p>
        )}
      </div>

      {/* Timeline of checks */}
      {investigation.checks.length > 0 && (
        <div>
          <h3 className="section-label mb-4">Historial de verificaciones</h3>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-fg/[0.06]" />

            <div className="space-y-4">
              {investigation.checks.map((check, i) => {
                const v = VERDICT_LABELS[check.verdict || 'unverified'] || VERDICT_LABELS.unverified;
                const prevCheck = investigation.checks[i + 1];
                const confidenceChange = prevCheck && check.confidence && prevCheck.confidence
                  ? check.confidence - prevCheck.confidence
                  : null;

                return (
                  <div key={check.id} className="relative pl-7">
                    {/* Dot */}
                    <div className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
                      i === 0
                        ? 'border-accent bg-accent/20'
                        : 'border-fg/10 bg-surface'
                    }`} />

                    <div className="glass p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${v.color}`}>
                          {v.label}
                          {check.confidence !== null && (
                            <span className="text-fg/25 ml-1.5">{check.confidence}%</span>
                          )}
                        </span>

                        <div className="flex items-center gap-2">
                          {confidenceChange !== null && confidenceChange !== 0 && (
                            <span className={`flex items-center gap-0.5 text-[10px] ${
                              confidenceChange > 0 ? 'text-emerald-400/60' : 'text-red-400/60'
                            }`}>
                              {confidenceChange > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {confidenceChange > 0 ? '+' : ''}{confidenceChange}
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-[10px] text-fg/20">
                            <Clock size={9} />
                            {formatDate(check.created_at)}
                          </span>
                        </div>
                      </div>

                      {check.summary && (
                        <p className="text-[13px] text-fg/50 leading-relaxed mb-1.5">
                          {check.summary}
                        </p>
                      )}

                      {check.sources_added > 0 && (
                        <span className="text-[10px] text-accent/40">
                          +{check.sources_added} fuentes nuevas
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sources */}
      {investigation.sources.length > 0 && (
        <div>
          <h3 className="section-label mb-4">
            Fuentes acumuladas ({investigation.sources.length})
          </h3>

          <div className="space-y-2">
            {investigation.sources.map((source) => (
              <div key={source.id} className="glass p-3.5 glass-hover group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CredibilityDot score={source.credibility_score} />
                      <span className="text-[10px] text-fg/25 uppercase tracking-wider">
                        {source.source_name || source.source_type || 'Fuente'}
                      </span>
                      {source.supports_claim !== null && (
                        <span className={`text-[10px] ${
                          source.supports_claim ? 'text-emerald-400/50' : 'text-red-400/50'
                        }`}>
                          {source.supports_claim ? 'Apoya' : 'Contradice'}
                        </span>
                      )}
                    </div>

                    <p className="text-[13px] text-fg/70 leading-snug truncate">
                      {source.title || source.url}
                    </p>

                    {source.snippet && (
                      <p className="text-[11px] text-fg/30 mt-1 line-clamp-2">
                        {source.snippet}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                    {source.published_at && (
                      <span className="text-[10px] text-fg/15">
                        {formatDate(source.published_at)}
                      </span>
                    )}
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded text-fg/15 hover:text-accent/60 transition-colors"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Credibility micro-bar */}
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex-1 h-[2px] rounded-full bg-fg/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${source.credibility_score}%`,
                        background: source.credibility_score >= 80
                          ? '#10b981'
                          : source.credibility_score >= 60
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-fg/15 tabular-nums w-6 text-right">
                    {source.credibility_score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {investigation.checks.length === 0 && investigation.sources.length === 0 && (
        <div className="glass p-8 text-center">
          <Shield size={24} className="mx-auto mb-3 text-fg/10" />
          <p className="text-sm text-fg/30">
            Caso recién creado. Las fuentes se acumularán con cada verificación.
          </p>
        </div>
      )}
    </div>
  );
}
