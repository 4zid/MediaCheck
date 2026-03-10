'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function AppNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { href: '/', label: 'Tendencias' },
    { href: '/verificado', label: 'Verificado' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-2xl mx-auto px-5 flex items-center h-14 gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 mr-4">
          <ShieldCheck size={20} className="text-indigo-500" />
          <span className="font-extrabold text-base tracking-tight hidden sm:block">MediaCheck</span>
        </Link>

        {/* Tabs */}
        <nav className="flex items-center gap-1 flex-1">
          {tabs.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Dark mode */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-gray-500 dark:text-gray-400"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
