'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Public] Page failed to render:', error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-20 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#00A651]">Eton Safaris</p>
        <h1 className="mt-3 font-serif text-3xl font-bold text-gray-900">This page could not be loaded</h1>
        <p className="mt-3 text-gray-600">Please try again. Your data has not been changed.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={() => reset()} className="rounded-lg bg-[#00A651] px-5 py-2.5 font-semibold text-white">
            Try again
          </button>
          <Link href="/" className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
