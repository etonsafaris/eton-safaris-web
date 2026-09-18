import Link from 'next/link';

/** In-shell placeholder when a record is missing or still loading — not the global 404 page. */
export default function PublicRecordUnavailable({
  title = 'This content is unavailable right now',
  message = 'The database may be slow or the link may be outdated. Try again in a moment, browse tours, or go home.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <section className="bg-white px-4 py-20 text-center md:py-28">
      <h1 className="font-serif text-3xl font-bold text-[#111] md:text-4xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-lg text-base text-[#555]">{message}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex rounded-full bg-[#00A651] px-6 py-3 text-sm font-semibold text-white hover:bg-[#009247]"
        >
          Go home
        </Link>
        <Link
          href="/tours"
          className="inline-flex rounded-full border border-[#00A651] px-6 py-3 text-sm font-semibold text-[#00A651] hover:bg-[#f0f8f4]"
        >
          Browse tours
        </Link>
      </div>
    </section>
  );
}
