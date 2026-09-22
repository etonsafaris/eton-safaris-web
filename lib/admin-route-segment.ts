/** Import on admin pages/layouts so Vercel never statically analyzes admin UI at build time. */
export const adminRouteSegment = {
  dynamic: 'force-dynamic' as const,
  fetchCache: 'force-no-store' as const,
  revalidate: 0,
};
