'use client';

interface DateFilterProps {
  selected: string;
  onChange: (range: string) => void;
}

const DATE_RANGES = [
  { value: 'all', label: 'Todo' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

export function DateFilter({ selected, onChange }: DateFilterProps) {
  return (
    <div className="flex gap-1">
      {DATE_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selected === range.value
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
