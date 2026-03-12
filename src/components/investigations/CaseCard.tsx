'use client';

import { RefreshCw, Clock, Layers, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface CaseCardProps {
  investigation: {
    id: string;
    title: string;
    summary: string | null;
    status: 'active' | 'resolved' | 'dismissed';
    verdict: string | null;
    confidence: number;
    category: string;
    manual_recheck_used: boolean;
    source_count: number;
    last_checked_at: string | null;
    created_at: string;
  };
  onRecheck: (id: string) => void;
  onSelect: (id: string) => void;
}

const VERDICT_STYLES: Record<string, { label: string; color: string; barColor: string; barLight: string }> = {
  verified: { label: 'Verificado', color: 'text-emerald-400', barColor: '#10b981', barLight: '#34d399' },
  partially_true: { label: 'Parcial', color: 'text-amber-400', barColor: '#f59e0b', barLight: '#fbbf24' },
  false: { label: 'Falso', color: 'text-red-400', barColor: '#ef4444', barLight: '#f87171' },
  misleading: { label: 'Engañoso', color: 'text-orange-400', barColor: '#f97316', barLight: '#fb923c' },
  unverified: { label: 'Sin verificar', color: 'text-fg/40', barColor: '#52525b', barLight: '#71717a' },
};

const CATEGORY_LABELS: Record<string, string> = {
  politics: 'Politica',
  health: 'Salud',
  technology: 'Tech',
  economy: 'Economia',
  environment: 'Ambiente',
  social: 'Social',
  science: 'Ciencia',
  entertainment: 'Entret.',
  other: 'General',
};

export function CaseCard({ investigation, onRecheck, onSelect }: CaseCardProps) {
  const verdict = VERDICT_STYLES[investigation.verdict || 'unverified'] || VERDICT_STYLES.unverified;
  const isResolved = investigation.status === 'resolved';

  let lastChecked = '';
  try {
    if (investigation.last_checked_at) {
      lastChecked = formatDistanceToNow(new Date(investigation.last_checked_at), { locale: es, addSuffix: true });
    }
  } catch { /* ignore */ }

  return (
    <div
      onClick={() => onSelect(investigation.id)}
      className={`group relative glass glass-hover cursor-pointer p-5 transition-all duration-300 ${
        isResolved ? 'opacity-60' : ''
      }`}
      style={{ animationDelay: '0.1s' }}
    >
      {/* Subtle accent glow on active cases */}
      {!isResolved && investigation.verdict && investigation.verdict !== 'unverified' && (
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${verdict.barColor}08 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Top row: category + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-accent/70">
          {CATEGORY_LABELS[investigation.category] || 'General'}
        </span>
        {isResolved ? (
          <span className="flex items-center gap-1 text-[10px] text-fg/30 tracking-wider uppercase">
            <CheckCircle size={10} />
            Resuelto
          </span>
        ) : (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-headline text-[15px] font-semibold leading-snug text-fg/90 line-clamp-2 mb-2 group-hover:text-fg transition-colors">
        {investigation.title}
      </h3>

      {/* Verdict badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-medium ${verdict.color}`}>
          {verdict.label}
        </span>
        {investigation.confidence > 0 && (
          <span className="text-[11px] text-fg/25 tabular-nums">
            {investigation.confidence}%
          </span>
        )}
      </div>

      {/* Confidence bar */}
      <div className="verdict-bar mb-4">
        <div
          className="verdict-bar-fill"
          style={{
            '--meter-value': `${investigation.confidence}%`,
            '--bar-color': verdict.barColor,
            '--bar-color-light': verdict.barLight,
          } as React.CSSProperties}
        />
      </div>

      {/* Footer: meta + action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-fg/25">
            <Layers size={11} />
            {investigation.source_count}
          </span>
          {lastChecked && (
            <span className="flex items-center gap-1 text-[11px] text-fg/20">
              <Clock size={10} />
              {lastChecked}
            </span>
          )}
        </div>

        {!isResolved && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRecheck(investigation.id);
            }}
            disabled={investigation.manual_recheck_used}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 ${
              investigation.manual_recheck_used
                ? 'text-fg/15 cursor-not-allowed'
                : 'text-accent/70 hover:text-accent hover:bg-accent/10 active:scale-95'
            }`}
          >
            <RefreshCw size={11} />
            Re-investigar
          </button>
        )}
      </div>
    </div>
  );
}
