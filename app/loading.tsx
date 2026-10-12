/** Shown inside the already-visible header while a page's data is still loading. */
export default function RootLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16" role="status" aria-live="polite">
      <p className="text-sm text-gray-500">Loading...</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-52 animate-pulse rounded-sm bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
