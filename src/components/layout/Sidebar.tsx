'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Home, Send, Sun, Moon, Hash } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { VerdictType } from '@/lib/types';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  selectedVerdict?: VerdictType;
  onVerdictChange?: (v: VerdictType | undefined) => void;
}

export function Sidebar(_props: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { href: '/', icon: Home, label: 'Inicio' },
    { href: '/category/politics', icon: Hash, label: 'Explorar' },
  ];

  return (
    <nav className="hidden lg:flex flex-col sticky top-0 h-screen w-[72px] xl:w-[260px] py-2 px-2 xl:px-4 flex-shrink-0">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-3 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors mb-1 w-fit xl:w-auto"
      >
        <ShieldCheck size={28} className="text-indigo-500 flex-shrink-0" />
        <span className="hidden xl:block text-xl font-extrabold tracking-tight">MediaCheck</span>
      </Link>

      {/* Nav items */}
      {navItems.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-4 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors mb-0.5 w-fit xl:w-full text-xl ${
            pathname === href
              ? 'font-bold text-gray-900 dark:text-white'
              : 'font-normal text-gray-700 dark:text-gray-300'
          }`}
        >
          <Icon size={26} className="flex-shrink-0" />
          <span className="hidden xl:block">{label}</span>
        </Link>
      ))}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="flex items-center gap-4 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors mb-0.5 w-fit xl:w-full text-xl text-gray-700 dark:text-gray-300"
      >
        {theme === 'dark' ? (
          <Sun size={26} className="flex-shrink-0" />
        ) : (
          <Moon size={26} className="flex-shrink-0" />
        )}
        <span className="hidden xl:block">
          {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </span>
      </button>

      {/* Verificar CTA button */}
      <Link
        href="/submit"
        className="mt-4 flex items-center justify-center xl:justify-start gap-3 p-3 xl:px-7 xl:py-4 rounded-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-bold transition-colors w-14 xl:w-full text-lg"
      >
        <Send size={20} className="flex-shrink-0" />
        <span className="hidden xl:block">Verificar</span>
      </Link>
    </nav>
  );
}
