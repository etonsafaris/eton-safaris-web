/**
 * Public pages use a short ISR window so clicks can reuse a warm HTML/RSC
 * payload instead of blocking on a fresh CMS round-trip every time.
 * Admin saves still refresh in the same browser via cms-live.
 */
export const dynamic = 'auto';
export const revalidate = 60;
export const fetchCache = 'auto';
