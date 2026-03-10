'use client';

import Link from 'next/link';
import { ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="lg:hidden sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-xl px-4">
      <div className="flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck className="text-indigo-500" size={24} />
          <span className="font-extrabold text-lg tracking-tight">MediaCheck</span>
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
