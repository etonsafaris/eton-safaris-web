'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Public] Page failed to render:', error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-20 text-center">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">This page could not be loaded</h1>
        <p className="mt-3 text-gray-600">Please try again. Your data has not been changed.</p>
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
