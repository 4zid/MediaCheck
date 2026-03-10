'use client';

const SOURCES = [
  { key: 'all', label: 'Todas' },
  { key: 'bbc', label: 'BBC' },
  { key: 'reuters', label: 'Reuters' },
  { key: 'nytimes', label: 'NY Times' },
  { key: 'guardian', label: 'Guardian' },
  { key: 'elpais', label: 'El País' },
  { key: 'gdelt', label: 'GDELT' },
];

interface SourceFilterProps {
  activeSource: string;
  onSourceChange: (source: string) => void;
}

export function SourceFilter({ activeSource, onSourceChange }: SourceFilterProps) {
  return (
    <div className="flex items-center gap-1.5 px-5 py-3 overflow-x-auto scrollbar-none border-b border-gray-100 dark:border-wire-border">
      {SOURCES.map(({ key, label }) => {
        const active = activeSource === key;
        return (
          <button
            key={key}
            onClick={() => onSourceChange(key)}
            className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] tracking-wider uppercase transition-all ${
              active
                ? 'bg-gray-900 dark:bg-white text-white dark:text-black font-bold'
                : 'bg-gray-100 dark:bg-surface-overlay text-gray-500 dark:text-wire-muted hover:text-gray-700 dark:hover:text-white/80 hover:bg-gray-200 dark:hover:bg-wire-border'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
