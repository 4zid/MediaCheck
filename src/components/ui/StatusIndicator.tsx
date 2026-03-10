import type { VerdictType } from '@/lib/types';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'sin-verificar': { color: 'bg-amber-600', label: 'Sin verificar' },
  verified: { color: 'bg-green-500', label: 'Verificado' },
  partially_true: { color: 'bg-amber-500', label: 'Parcialmente cierto' },
  false: { color: 'bg-red-500', label: 'Falso' },
  misleading: { color: 'bg-orange-500', label: 'Engañoso' },
  unverified: { color: 'bg-gray-500', label: 'No verificado' },
};

interface StatusIndicatorProps {
  status: VerdictType | 'sin-verificar';
  showLabel?: boolean;
}

export function StatusIndicator({ status, showLabel = false }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['sin-verificar'];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
      {showLabel && (
        <span className="text-[10px] tracking-wider text-wire-muted uppercase">
          {config.label}
        </span>
      )}
    </span>
  );
}
