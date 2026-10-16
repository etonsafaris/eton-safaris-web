/** True while `next build` is prerendering static pages (skip heavy DB fan-out). */
export function isNextProductionBuild() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

export function skipParkStaysDuringBuild() {
  return isNextProductionBuild() || process.env.SKIP_BUILD_STAYS === '1';
}

/**
 * Never fan-out thousands of slug pages during `next build`.
 * That exhausted Aiven ("too many clients") and timed out Vercel (946 pages).
 * Public routes stay ISR (`revalidate = 900`) and compile on first request.
 */
export function skipStaticGenerationDuringBuild() {
  if (process.env.SKIP_BUILD_STATIC_PARAMS === '1') return true;
  if (!process.env.DATABASE_URL?.trim()) return true;
  if (isNextProductionBuild()) return true;
  return false;
}
