/** Lightweight shell while RSC pages stream — keeps first paint fast on slow networks. */
export default function RootLoading() {
  return (
    <div className="min-h-[40vh] animate-pulse bg-white" aria-hidden="true" />
  );
}
