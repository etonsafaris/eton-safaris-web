/** True while `next build` is prerendering static pages (skip heavy DB fan-out). */
export function isNextProductionBuild() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

export function skipParkStaysDuringBuild() {
  return isNextProductionBuild() || process.env.SKIP_BUILD_STAYS === '1';
}

/**
 * Skip `generateStaticParams` only when the build has no Aiven URL, or when
 * SKIP_BUILD_STATIC_PARAMS=1 is set. With DATABASE_URL present, slug lists
 * are queried so Vercel can ISR-prerender public detail routes.
 */
export function skipStaticGenerationDuringBuild() {
  if (process.env.SKIP_BUILD_STATIC_PARAMS === '1') return true;
  if (!process.env.DATABASE_URL?.trim()) return true;
  return false;
}
