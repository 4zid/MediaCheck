'use client';

import { VerificationStepComponent } from './VerificationStep';
import type { VerificationStep } from '@/lib/types';

interface VerificationTimelineProps {
  steps: VerificationStep[];
}

export function VerificationTimeline({ steps }: VerificationTimelineProps) {
  return (
    <div className="space-y-4 py-4">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const status = step.step === 'complete'
          ? 'complete' as const
          : isLast
          ? 'active' as const
          : 'complete' as const;

        return (
          <VerificationStepComponent
            key={`${step.step}-${i}`}
            step={step.step}
            label={step.label}
            status={status}
            delay={i * 200}
          />
        );
      })}
    </div>
  );
}
