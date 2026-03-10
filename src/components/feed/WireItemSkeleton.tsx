export function WireItemSkeleton() {
  return (
    <div className="px-5 py-4 border-b border-gray-100 dark:border-wire-border animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-wire-border" />
        <div className="h-2.5 w-14 bg-gray-200 dark:bg-surface-overlay rounded" />
        <div className="h-2.5 w-10 bg-gray-200 dark:bg-surface-overlay rounded" />
      </div>
      <div className="h-5 w-full bg-gray-200 dark:bg-surface-overlay rounded mb-1.5" />
      <div className="h-5 w-4/5 bg-gray-200 dark:bg-surface-overlay rounded mb-2" />
      <div className="h-2 w-24 bg-gray-100 dark:bg-surface-overlay/50 rounded" />
    </div>
  );
}
