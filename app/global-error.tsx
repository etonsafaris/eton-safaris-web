'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-white p-8 font-sans text-gray-900">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-gray-600">Our team has been notified. Please try again.</p>
        <button
          type="button"
          className="mt-6 rounded bg-[#00A651] px-4 py-2 text-white"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
