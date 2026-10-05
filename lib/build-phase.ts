/** True while `next build` is prerendering static pages (skip heavy DB fan-out). */
export function isNextProductionBuild() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

export function skipParkStaysDuringBuild() {
  return isNextProductionBuild() || process.env.SKIP_BUILD_STAYS === '1';
}

/**
 * Skip `generateStaticParams` slug fan-out (set SKIP_BUILD_STATIC_PARAMS=1 on CI if build DB is unavailable).
 * On Vercel Pro, builds with DATABASE_URL should pre-render top slugs for sub-50ms navigations.
 */
export function skipStaticGenerationDuringBuild() {
  if (process.env.SKIP_BUILD_STATIC_PARAMS === '1') return true;
  if (!process.env.DATABASE_URL?.trim()) return true;
  if (isNextProductionBuild()) return true;
  return false;
}
