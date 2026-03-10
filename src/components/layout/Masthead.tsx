'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

function formatSpanishDate(): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
}

export function Masthead() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { href: '/', label: 'Wire' },
    { href: '/verificado', label: 'Archivo' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface/95 backdrop-blur-md border-b border-gray-200 dark:border-wire-border">
      <div className="max-w-5xl mx-auto px-5">
        {/* Top row: date + theme toggle */}
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-wire-border/50">
          <span className="text-[11px] tracking-wide text-gray-400 dark:text-wire-muted uppercase">
            {formatSpanishDate()}
          </span>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded text-gray-400 dark:text-wire-muted hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        {/* Masthead title */}
        <div className="py-4 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl sm:text-3xl font-headline tracking-[0.08em] text-gray-900 dark:text-white uppercase">
              MEDIACHECK
            </h1>
          </Link>
          <p className="text-[10px] tracking-[0.3em] text-gray-400 dark:text-wire-muted uppercase mt-0.5">
            Verificación independiente de hechos
          </p>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-6 justify-center pb-2">
          {tabs.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`text-xs tracking-[0.15em] uppercase pb-2 border-b-2 transition-colors ${
                  active
                    ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-400 dark:text-wire-muted hover:text-gray-600 dark:hover:text-white/70'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
