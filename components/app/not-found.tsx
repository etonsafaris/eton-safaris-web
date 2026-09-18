import Link from 'next/link';
import PageHero from '@/components/public/PageHero';
import PublicShellServer from '@/components/public/PublicShellServer';

export default async function NotFound() {
  return (
    <PublicShellServer>
      <PageHero
        title="Page not found"
        subtitle="This page is missing or has been moved. Return home to continue planning your safari."
      />
      <section className="flex min-h-[40vh] items-center justify-center px-4 py-16">
        <div className="max-w-lg text-center">
          <Link
            href="/"
            className="inline-flex rounded-full bg-moss-accent px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-forest"
          >
            Go Home
          </Link>
        </div>
      </section>
    </PublicShellServer>
  );
}
