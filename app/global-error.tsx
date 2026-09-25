'use client';

import { useEffect } from 'react';
import './globals.css';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[App] Unrecoverable render error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#fafcf9]">
        <main className="flex min-h-screen items-center justify-center px-6 py-20 text-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#00A651]">Eton Safaris</p>
            <h1 className="mt-3 font-serif text-3xl font-bold text-gray-900">Something went wrong</h1>
            <p className="mt-3 text-gray-600">Refresh this page or try again in a moment.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  try {
                    reset();
                  } catch {
                    window.location.reload();
                  }
                }}
                className="rounded-lg bg-[#00A651] px-5 py-2.5 font-semibold text-white"
              >
                Try again
              </button>
              <a
                href="/"
                className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700"
              >
                Go home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
