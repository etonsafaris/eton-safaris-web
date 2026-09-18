import Link from 'next/link';
import PublicShellServer from '@/components/public/PublicShellServer';

export default async function NotFound() {
  return (
    <PublicShellServer>
      <section className="bg-[#0f1410] px-4 py-20 text-center text-white md:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#7dd3a0]">Eton Safaris</p>
        <h1 className="mt-4 font-serif text-4xl font-bold md:text-5xl">This page isn&apos;t here</h1>
        <p className="mx-auto mt-4 max-w-md text-base text-white/75">
          The link may be outdated. Try search on the tours page, or head home to plan your safari.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex rounded-full bg-[#00A651] px-6 py-3 text-sm font-semibold text-white hover:bg-[#009247]"
          >
            Go home
          </Link>
          <Link
            href="/tours"
            className="inline-flex rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Search tours
          </Link>
        </div>
      </section>
    </PublicShellServer>
  );
}
