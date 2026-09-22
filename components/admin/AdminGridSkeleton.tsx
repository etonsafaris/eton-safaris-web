export default function AdminGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm dark:border-white/10 dark:bg-[#111827]"
        >
          <div className="h-36 bg-[#e5e7eb] dark:bg-white/10" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 rounded bg-[#e5e7eb] dark:bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-[#f3f4f6] dark:bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
