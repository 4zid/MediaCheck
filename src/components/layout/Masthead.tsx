'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function Masthead() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { href: '/', label: 'Casos' },
    { href: '/verificado', label: 'Archivo' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-2xl border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 group-hover:border-accent/30 transition-all duration-300">
              <span className="text-accent text-xs font-headline font-bold">m</span>
            </div>
            <span className="font-headline text-[15px] font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">
              mediacheck
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {tabs.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                    active
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-200"
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
}
