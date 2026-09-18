'use client';

/**
 * Client refetches must never call `notFound()` — that replaces the whole page with the 404 screen
 * even when the server already rendered valid ISR content. Log and keep server data instead.
 */
export function triggerNotFound(reason?: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[Public] Skipped client notFound:', reason || 'record refetch miss');
  }
}
