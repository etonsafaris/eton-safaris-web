import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafcf9] px-4 py-16 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#00A651]">Eton Safaris</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">404 — Page not found</h1>
        <p className="mt-3 text-gray-600">This page is missing or has been moved.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-[#00A651] px-6 py-3 text-sm font-semibold text-white">
          Go Home
        </Link>
      </div>
    </main>
  );
}
