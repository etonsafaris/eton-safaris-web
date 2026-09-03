import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16 text-center">
      <div>
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-gray-600">This page is missing or has been moved.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-moss-accent px-6 py-3 text-sm font-semibold text-white">
          Go Home
        </Link>
      </div>
    </main>
  );
}
