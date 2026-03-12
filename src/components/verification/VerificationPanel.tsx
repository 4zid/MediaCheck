'use client';

import { useEffect } from 'react';
import { ExternalLink, RotateCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useVerification } from '@/hooks/useVerification';
import { VerificationTimeline } from './VerificationTimeline';
import { VerdictDisplay } from './VerdictDisplay';
import { SourceCard } from './SourceCard';
import type { VerdictType } from '@/lib/types';

interface VerificationPanelProps {
  title: string;
  source: string;
  link: string;
}

export function VerificationPanel({ title, source, link }: VerificationPanelProps) {
  const { status, steps, result, error, verify, reset } = useVerification();

  useEffect(() => {
    verify(link, title);
    return () => reset();
  }, [link, title]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReverify = () => {
    reset();
    setTimeout(() => verify(link, title), 100);
  };

  return (
    <div className="space-y-6">
      {/* Article header */}
      <div className="space-y-3 pb-5 border-b border-wire-border">
        <span className="text-[10px] font-bold tracking-[0.15em] text-wire-muted uppercase">
          {source}
        </span>
        <h2 className="font-headline text-xl leading-snug text-fg">
          {title}
        </h2>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-wire-muted hover:text-fg/70 transition-colors"
        >
          <ExternalLink size={11} />
          <span className="tracking-wider uppercase">Ver noticia original</span>
        </a>
      </div>

      {/* Status states */}
      {status === 'checking_cache' && (
        <div className="flex items-center gap-2 text-sm text-wire-muted">
          <div className="w-3 h-3 border border-wire-muted/40 border-t-white/60 rounded-full animate-spin" />
          Buscando verificaciones previas...
        </div>
      )}

      {status === 'cached' && result && (
        <div className="space-y-6">
          {/* Cached indicator */}
          <div className="flex items-center gap-2 text-[11px] text-wire-muted">
            <Clock size={12} />
            <span className="tracking-wider uppercase">
              Verificado {result.created_at
                ? formatDistanceToNow(new Date(result.created_at), { locale: es, addSuffix: true })
                : 'previamente'}
            </span>
          </div>

          <VerdictDisplay
            verdict={result.verdict as VerdictType}
            confidence={result.confidence}
            summary={result.summary}
            analysis={result.analysis}
          />

          {result.sources.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-wire-muted uppercase">
                Fuentes ({result.sources.length})
              </h3>
              {result.sources.map((s, i) => (
                <SourceCard key={i} {...s} />
              ))}
            </div>
          )}

          {/* Re-verify button */}
          <button
            onClick={handleReverify}
            className="flex items-center gap-2 text-[11px] tracking-wider text-wire-muted hover:text-fg uppercase transition-colors"
          >
            <RotateCw size={12} />
            Re-verificar
          </button>
        </div>
      )}

      {status === 'verifying' && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold tracking-[0.15em] text-wire-muted uppercase">
            Verificando...
          </h3>
          <VerificationTimeline steps={steps} />
        </div>
      )}

      {status === 'complete' && result && (
        <div className="space-y-6">
          <VerificationTimeline steps={steps} />

          <div className="h-px bg-wire-border" />

          <VerdictDisplay
            verdict={result.verdict as VerdictType}
            confidence={result.confidence}
            summary={result.summary}
            analysis={result.analysis}
          />

          {result.sources.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-wire-muted uppercase">
                Fuentes ({result.sources.length})
              </h3>
              {result.sources.map((s, i) => (
                <SourceCard key={i} {...s} />
              ))}
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={handleReverify}
            className="flex items-center gap-2 text-[11px] tracking-wider text-wire-muted hover:text-fg uppercase transition-colors"
          >
            <RotateCw size={12} />
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
