import PublicAppRoot from '@/components/public/PublicAppRoot';

/** Unknown URLs. Real tours, parks, and stays never render this screen. */
export default function NotFound() {
  return (
    <PublicAppRoot>
      <main className="flex min-h-[50vh] items-center justify-center bg-white px-6 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#00A651]">Eton Safaris</p>
          <p className="mt-4 text-gray-600">Head home to plan your safari.</p>
          <a href="/" className="mt-6 inline-block rounded-full bg-[#00A651] px-6 py-3 font-semibold text-white">
            Go home
          </a>
        </div>
      </main>
    </PublicAppRoot>
  );
}
