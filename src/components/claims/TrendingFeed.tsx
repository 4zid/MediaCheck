'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Loader2, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import type { FeedItem } from '@/lib/types';

export function TrendingFeed() {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/feeds?limit=8')
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleVerify = async (item: FeedItem, index: number) => {
    setVerifying(index);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: item.title, sourceUrl: item.link }),
      });
      const data = await res.json();
      if (data.claim?.id) {
        router.push(`/claim/${data.claim.id}`);
      } else if (data.result) {
        // stored: false but got result — show it on home
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setVerifying(null);
    }
  };

  if (loading) {
    return (
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Tendencias
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="min-w-[240px] h-36 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Tendencias
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {items.map((item, i) => (
          <div
            key={i}
            className="min-w-[260px] max-w-[260px] flex-shrink-0 snap-start flex flex-col justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50"
          >
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full truncate">
                  {item.source}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDistanceToNow(new Date(item.pubDate), {
                    locale: es,
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug line-clamp-3 mb-3">
                {item.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVerify(item, i)}
                disabled={verifying !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {verifying === i ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Zap size={12} />
                )}
                {verifying === i ? 'Verificando...' : 'Verificar'}
              </button>
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
