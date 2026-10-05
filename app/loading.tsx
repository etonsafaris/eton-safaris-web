/** Lightweight shell while RSC pages stream — keeps first paint fast on slow networks. */
export default function RootLoading() {
  return (
    <div className="min-h-[50vh] animate-pulse bg-gradient-to-b from-[#0f1410] via-[#1a241c] to-white" aria-hidden="true" />
  );
}
