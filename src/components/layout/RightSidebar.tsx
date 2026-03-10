'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Zap, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { FeedItem } from '@/lib/types';

interface RightSidebarProps {
  onSearch: (q: string) => void;
}

export function RightSidebar({ onSearch }: RightSidebarProps) {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [verifying, setVerifying] = useState<number | null>(null);
  const [searchVal, setSearchVal] = useState('');

  useEffect(() => {
    fetch('/api/feeds?limit=7')
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => {});
  }, []);

  const handleVerify = async (item: FeedItem, i: number) => {
    setVerifying(i);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: item.title, sourceUrl: item.link }),
      });
      const data = await res.json();
      if (data.claim?.id) router.push(`/claim/${data.claim.id}`);
    } catch {
      // ignore
    } finally {
      setVerifying(null);
    }
  };

  return (
    <aside className="hidden lg:block sticky top-0 h-screen overflow-y-auto w-[340px] xl:w-[380px] flex-shrink-0 px-4 py-3">
      {/* Search */}
      <div className="sticky top-0 bg-white dark:bg-black pb-3 z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(searchVal);
          }}
        >
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              value={searchVal}
              onChange={(e) => {
                setSearchVal(e.target.value);
                if (!e.target.value) onSearch('');
              }}
              placeholder="Buscar verificaciones"
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-full py-3 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all"
            />
          </div>
        </form>
      </div>

      {/* Trending box */}
      {items.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl overflow-hidden mb-4">
          <h2 className="text-xl font-bold px-4 py-3 text-gray-900 dark:text-white">
            Qué está pasando
          </h2>
          {items.map((item, i) => (
            <div
              key={i}
              className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
            >
              <p className="text-xs text-gray-500 mb-0.5">
                {item.source} ·{' '}
                {formatDistanceToNow(new Date(item.pubDate), {
                  locale: es,
                  addSuffix: true,
                })}
              </p>
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">
                {item.title}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleVerify(item, i)}
                  disabled={verifying !== null}
                  className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 text-xs font-semibold disabled:opacity-40 transition-colors"
                >
                  {verifying === i ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Zap size={11} />
                  )}
                  {verifying === i ? 'Verificando...' : 'Verificar'}
                </button>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-gray-400 px-1">
        Verificaciones asistidas por Claude AI · MediaCheck 2025
      </p>
    </aside>
  );
}
