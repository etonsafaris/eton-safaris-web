/** True while `next build` is prerendering static pages (skip heavy DB fan-out). */
export function isNextProductionBuild() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

export function skipParkStaysDuringBuild() {
  return isNextProductionBuild() || process.env.SKIP_BUILD_STAYS === '1';
}

/** Skip pre-rendering hundreds of detail URLs during `next build` (saves Aiven connections). */
export function skipStaticGenerationDuringBuild() {
  return isNextProductionBuild() || process.env.SKIP_BUILD_STATIC_PARAMS === '1';
}
