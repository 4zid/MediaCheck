'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORIES, VERDICT_CONFIG, type ClaimCategory, type VerdictType } from '@/lib/types';
import { TrendingUp, Clock, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory?: ClaimCategory;
  selectedVerdict?: VerdictType;
  onVerdictChange?: (verdict: VerdictType | undefined) => void;
}

export function Sidebar({ isOpen, onClose, selectedVerdict, onVerdictChange }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside className={`fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] w-72 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-y-auto transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4">
          {/* Mobile close */}
          <div className="flex items-center justify-between lg:hidden mb-4">
            <span className="font-semibold">Menu</span>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 mb-6">
            <Link
              href="/"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Clock size={18} />
              Recientes
            </Link>
            <Link
              href="/?sort=trending"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <TrendingUp size={18} />
              Tendencias
            </Link>
          </nav>

          {/* Categories */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">
              Categorias
            </h3>
            <nav className="space-y-0.5">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  href={`/category/${cat.value}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === `/category/${cat.value}`
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Verdict filter */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">
              Veredicto
            </h3>
            <div className="space-y-0.5">
              {(Object.entries(VERDICT_CONFIG) as [VerdictType, typeof VERDICT_CONFIG[VerdictType]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => onVerdictChange?.(selectedVerdict === key ? undefined : key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedVerdict === key
                      ? `${config.bg} ${config.color} font-medium`
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${config.bg} ${config.color}`}>
                    {config.icon}
                  </span>
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
