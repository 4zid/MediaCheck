'use client';

export function FeedHeader() {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-wire-border">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-xs font-bold tracking-[0.2em] text-gray-400 dark:text-wire-muted uppercase">
          Wire
        </span>
      </div>
      <div className="flex-1 h-px bg-gray-100 dark:bg-wire-border" />
      <span className="text-[10px] text-gray-400 dark:text-wire-muted tracking-wider uppercase">
        En vivo
      </span>
    </div>
  );
}
