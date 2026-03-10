import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <ShieldCheck size={18} className="text-indigo-500" />
            <span className="text-sm">MediaCheck &mdash; Verificacion de hechos con IA</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Las verificaciones son asistidas por IA y deben ser contrastadas con juicio critico.
          </p>
        </div>
      </div>
    </footer>
  );
}
