import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { NewsStatus } from '@/app/api/news/route';
import { CATEGORIES } from '@/lib/types';

interface NewsBlockProps {
  title: string;
  source: string;
  pubDate: string;
  link?: string;
  status: NewsStatus;
  confidence?: number;
  category?: string;
}

export function NewsBlock({ title, source, pubDate, link, status, confidence, category }: NewsBlockProps) {
  const cat = CATEGORIES.find((c) => c.value === category);

  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(new Date(pubDate), { locale: es, addSuffix: true });
  } catch {
    timeAgo = '';
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-800/80 px-5 py-4 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
      {/* Top row: source · category · time · status */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {source}
        </span>
        {cat && (
          <span className="text-xs text-gray-400">
            · {cat.emoji} {cat.label}
          </span>
        )}
        {timeAgo && (
          <span className="text-xs text-gray-400">· {timeAgo}</span>
        )}
        <div className="ml-auto">
          <StatusBadge status={status} confidence={confidence} />
        </div>
      </div>

      {/* Headline */}
      <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug">
        {title}
      </p>

      {/* Link */}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
        >
          <ExternalLink size={11} />
          Leer noticia
        </a>
      )}
    </div>
  );
}
