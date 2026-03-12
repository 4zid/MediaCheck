'use client';

import { Search, Globe, Brain, CheckCircle } from 'lucide-react';
import type { VerificationStepType } from '@/lib/types';

const STEP_CONFIG: Record<VerificationStepType, {
  icon: typeof Search;
  activeColor: string;
}> = {
  searching_sources: { icon: Search, activeColor: 'text-status-analyzing' },
  sources_found: { icon: Globe, activeColor: 'text-status-analyzing' },
  checking_factcheckers: { icon: Globe, activeColor: 'text-status-analyzing' },
  analyzing: { icon: Brain, activeColor: 'text-status-analyzing' },
  complete: { icon: CheckCircle, activeColor: 'text-status-verified' },
};

interface VerificationStepProps {
  step: VerificationStepType;
  label: string;
  status: 'pending' | 'active' | 'complete';
  delay?: number;
}

export function VerificationStepComponent({ step, label, status, delay = 0 }: VerificationStepProps) {
  const config = STEP_CONFIG[step];
  const Icon = config.icon;

  return (
    <div
      className="flex items-start gap-3 animate-step-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 ${
        status === 'complete'
          ? 'text-status-verified'
          : status === 'active'
          ? `${config.activeColor} animate-pulse-glow`
          : 'text-wire-muted/30'
      }`}>
        <Icon size={16} strokeWidth={1.5} />
      </div>

      {/* Label */}
      <span className={`text-sm leading-snug ${
        status === 'complete'
          ? 'text-fg/70'
          : status === 'active'
          ? 'text-fg'
          : 'text-wire-muted/40'
      }`}>
        {label}
      </span>
    </div>
  );
}
