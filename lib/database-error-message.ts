/**
 * User-facing database errors (admin UI, uploads, API JSON).
 * Safe to import from client components — no secrets.
 */

export function isPgDnsOrHostError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /ENOTFOUND|ENOENT|EAI_AGAIN|getaddrinfo|ECONNREFUSED|no such host|name or service not known|could not translate host/i.test(
    message
  );
}

export function isPgAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /password authentication failed|authentication failed/i.test(message);
}

export function isPgNotConfiguredError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /DATABASE_URL is not configured|aiven DATABASE_URL/i.test(message);
}

function hostFromErrorMessage(message: string): string {
  const enot = message.match(/ENOTFOUND\s+([^\s'"]+)/i);
  if (enot?.[1]) return enot[1];
  const aiven = message.match(/([a-z0-9-]+\.(?:[a-z]\.)?aivencloud\.com)/i);
  if (aiven?.[1]) return aiven[1];
  return '';
}

/** Map raw driver / API errors to actionable copy for staff. */
export function formatDatabaseErrorMessage(raw: unknown): string {
  const message =
    typeof raw === 'string'
      ? raw
      : raw instanceof Error
        ? raw.message
        : String(raw ?? 'Database error');

  const lower = message.toLowerCase();

  if (isPgNotConfiguredError(message)) {
    return 'Database is not configured. Add DATABASE_URL (Aiven PostgreSQL Service URI) to .env.local and Vercel Environment Variables, then restart or redeploy.';
  }

  if (isPgDnsOrHostError(message)) {
    const host = hostFromErrorMessage(message);
    const hostHint = host ? ` (${host})` : '';
    return (
      `Cannot reach the Aiven database server${hostHint}. ` +
      'In Aiven Console open your PostgreSQL service → Connection information → copy the current Service URI into DATABASE_URL in .env.local (local dev) and Vercel (production), then restart the dev server or redeploy. ' +
      'This error usually means the hostname is wrong, the service was recreated, or the free-tier service is powered off.'
    );
  }

  if (isPgAuthError(message)) {
    return 'Database login failed. In Aiven Console reset or copy the PostgreSQL password, update DATABASE_URL in .env.local and Vercel, then restart or redeploy.';
  }

  if (/too many clients|connection slots|database is busy/i.test(lower)) {
    return 'Database is busy. Wait a few seconds and click Retry.';
  }

  if (/timeout|timed out|abort/i.test(lower)) {
    return 'Database request timed out. Click Retry or check that Aiven is running.';
  }

  return message;
}
