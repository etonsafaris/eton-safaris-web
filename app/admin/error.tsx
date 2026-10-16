'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin] Module failed to render:', error);
  }, [error]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center px-6 py-16 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#00A651]">Admin</p>
        <h1 className="mt-3 text-2xl font-semibold text-gray-900">This module could not be loaded</h1>
        <p className="mt-3 text-gray-600">Try again. Your saved data was not changed.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-[#00A651] px-5 py-2.5 font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
