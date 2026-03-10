'use client';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { VerdictType } from '@/lib/types';

interface WireItemProps {
  title: string;
  source: string;
  pubDate: string;
  link: string;
  verificationStatus?: VerdictType | 'sin-verificar';
  onClick: () => void;
  style?: React.CSSProperties;
}

const STATUS_COLORS: Record<string, string> = {
  'sin-verificar': 'bg-amber-600',
  verified: 'bg-green-500',
  partially_true: 'bg-amber-500',
  false: 'bg-red-500',
  misleading: 'bg-orange-500',
  unverified: 'bg-gray-500',
};

export function WireItem({ title, source, pubDate, link, verificationStatus = 'sin-verificar', onClick, style }: WireItemProps) {
  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(new Date(pubDate), { locale: es, addSuffix: true });
  } catch {
    timeAgo = '';
  }

  const dotColor = STATUS_COLORS[verificationStatus] || STATUS_COLORS['sin-verificar'];

  let hostname = '';
  try {
    hostname = new URL(link).hostname.replace('www.', '');
  } catch {
    hostname = '';
  }

  return (
    <article
      onClick={onClick}
      className="group px-5 py-4 border-b border-gray-100 dark:border-wire-border hover:bg-gray-50 dark:hover:bg-surface-overlay/50 cursor-pointer transition-colors animate-fade-in"
      style={style}
    >
      {/* Meta row */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="text-[11px] font-bold tracking-[0.12em] text-gray-400 dark:text-wire-muted uppercase">
          {source}
        </span>
        {timeAgo && (
          <>
            <span className="text-gray-300 dark:text-wire-muted/40 text-[10px]">/</span>
            <span className="text-[10px] text-gray-400 dark:text-wire-muted/60">{timeAgo}</span>
          </>
        )}
      </div>

      {/* Headline */}
      <h3 className="font-headline text-lg leading-snug text-gray-900 dark:text-white/90 group-hover:text-black dark:group-hover:text-white transition-colors">
        {title}
      </h3>

      {/* Source link hint */}
      {hostname && (
        <div className="mt-1.5">
          <span className="text-[10px] text-gray-300 dark:text-wire-muted/40 tracking-wider uppercase">
            {hostname}
          </span>
        </div>
      )}
    </article>
  );
}
