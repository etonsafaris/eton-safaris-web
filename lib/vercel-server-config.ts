/**
 * Vercel serverless defaults (reference only).
 * Route handlers must use string/number literals for `runtime` and `maxDuration`
 * so Next.js can statically analyze them — see vercel.json `functions` for deploy limits.
 */
export const NODE_POSTGRES_MAX_DURATION = 30;
export const NODE_UPLOAD_MAX_DURATION = 60;
export const NODE_HEALTH_MAX_DURATION = 15;
