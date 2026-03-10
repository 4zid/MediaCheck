'use client';

import { VERDICT_CONFIG, type VerdictType } from '@/lib/types';

interface VerdictFilterProps {
  selected?: VerdictType;
  onChange: (verdict: VerdictType | undefined) => void;
}

export function VerdictFilter({ selected, onChange }: VerdictFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(undefined)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          !selected
            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        Todos
      </button>
      {(Object.entries(VERDICT_CONFIG) as [VerdictType, typeof VERDICT_CONFIG[VerdictType]][]).map(([key, config]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selected === key
              ? `${config.bg} ${config.color}`
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {config.icon} {config.label}
        </button>
      ))}
    </div>
  );
}
