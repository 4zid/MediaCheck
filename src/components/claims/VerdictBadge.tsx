import { VERDICT_CONFIG, type VerdictType } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

interface VerdictBadgeProps {
  verdict: VerdictType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function VerdictBadge({ verdict, size = 'md', showIcon = true }: VerdictBadgeProps) {
  const config = VERDICT_CONFIG[verdict];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge className={`${config.bg} ${config.color} ${sizeClasses[size]} font-semibold`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}
