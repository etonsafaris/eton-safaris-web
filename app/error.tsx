'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import PageHero from '@/components/public/PageHero';
import PublicShell from '@/components/public/PublicShell';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Public] Page failed to render:', error);
  }, [error]);

  return (
    <PublicShell>
      <PageHero
        title="This page could not be loaded"
        subtitle="Please try again. Your data has not been changed."
      />
      <section className="flex min-h-[40vh] items-center justify-center px-4 py-16">
        <div className="max-w-lg text-center">
          <div className="flex justify-center gap-3">
            <button 
              type="button" 
              onClick={() => reset()} 
              className="rounded-full bg-moss-accent px-6 py-3 font-semibold text-white hover:bg-forest"
            >
              Try again
            </button>
            <Link 
              href="/" 
              className="rounded-full border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Go home
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
