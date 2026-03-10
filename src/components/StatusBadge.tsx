import type { NewsStatus } from '@/app/api/news/route';

interface StatusBadgeProps {
  status: NewsStatus;
  confidence?: number;
}

const CONFIG: Record<NewsStatus, { label: string; cls: string; pulse?: boolean }> = {
  verdadero:      { label: 'VERDADERO',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  fake:           { label: 'FAKE',         cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  chequeado:      { label: 'CHEQUEADO',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  analizando:     { label: 'ANALIZANDO',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', pulse: true },
  estimacion:     { label: 'ESTIMACIÓN',   cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
  'sin-verificar':{ label: 'SIN VERIFICAR',cls: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500' },
};

export function StatusBadge({ status, confidence }: StatusBadgeProps) {
  const { label, cls, pulse } = CONFIG[status];
  const text = status === 'estimacion' && confidence != null ? `${label} ${confidence}%` : label;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest ${cls} ${pulse ? 'animate-pulse' : ''}`}>
      {text}
    </span>
  );
}
