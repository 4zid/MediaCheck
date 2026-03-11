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

export function WireItem({ title, source, pubDate, onClick, style }: WireItemProps) {
  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(new Date(pubDate), { locale: es, addSuffix: true });
  } catch {
    timeAgo = '';
  }

  return (
    <article
      onClick={onClick}
      className="group px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-all duration-200 animate-fade-in"
      style={style}
    >
      {/* Title */}
      <h3 className="text-[14px] font-medium leading-snug text-white/75 group-hover:text-white/95 transition-colors mb-1.5">
        {title}
      </h3>

      {/* Meta */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-white/20 uppercase tracking-wider">
          {source}
        </span>
        {timeAgo && (
          <>
            <span className="text-white/8 text-[8px]">·</span>
            <span className="text-[11px] text-white/15">{timeAgo}</span>
          </>
        )}
      </div>
    </article>
  );
}
