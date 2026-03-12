'use client';

const SOURCES = [
  { key: 'all', label: 'Todas' },
  { key: 'argentina', label: 'Argentina' },
  { key: 'bbc', label: 'BBC' },
  { key: 'reuters', label: 'Reuters' },
  { key: 'nytimes', label: 'NY Times' },
  { key: 'guardian', label: 'Guardian' },
  { key: 'elpais', label: 'El Pais' },
  { key: 'gdelt', label: 'GDELT' },
];

const AR_CATEGORIES = [
  { key: 'ar-all', label: 'Todo AR' },
  { key: 'ar-politics', label: 'Politica' },
  { key: 'ar-economy', label: 'Economia' },
  { key: 'ar-justice', label: 'Justicia' },
  { key: 'ar-social', label: 'Social' },
];

interface SourceFilterProps {
  activeSource: string;
  onSourceChange: (source: string) => void;
}

export function SourceFilter({ activeSource, onSourceChange }: SourceFilterProps) {
  const isArgentina = activeSource === 'argentina' || activeSource.startsWith('ar-');

  return (
    <div className="space-y-0">
      {/* Main sources */}
      <div className="flex items-center gap-1.5 px-0 py-2.5 overflow-x-auto scrollbar-none">
        {SOURCES.map(({ key, label }) => {
          const active = activeSource === key || (key === 'argentina' && activeSource.startsWith('ar-'));
          return (
            <button
              key={key}
              onClick={() => onSourceChange(key === 'argentina' ? 'ar-all' : key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] tracking-wider font-medium transition-all duration-200 ${
                active
                  ? key === 'argentina' || activeSource.startsWith('ar-')
                    ? 'bg-accent/15 text-accent border border-accent/20'
                    : 'bg-fg/[0.08] text-fg'
                  : 'text-fg/25 hover:text-fg/50 hover:bg-fg/[0.04]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Argentina sub-categories */}
      {isArgentina && (
        <div className="flex items-center gap-1 px-0 pb-2.5 overflow-x-auto scrollbar-none animate-fade-in">
          {AR_CATEGORIES.map(({ key, label }) => {
            const active = activeSource === key;
            return (
              <button
                key={key}
                onClick={() => onSourceChange(key)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] tracking-wider transition-all duration-200 ${
                  active
                    ? 'bg-accent/10 text-accent/80'
                    : 'text-fg/20 hover:text-fg/40'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
