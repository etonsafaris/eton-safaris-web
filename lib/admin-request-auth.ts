import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { requireAdminUser } from '@/lib/require-admin';

/** HttpOnly flag set by POST /api/admin/session after Supabase sign-in. */
export function hasAdminSessionCookie(request: Request): boolean {
  const cookie = request.headers.get('cookie') || '';
  return cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
}

/** Cookie (fast path) or valid Supabase bearer token (fallback when cookie expired). */
export async function allowAdminRequest(request: Request): Promise<boolean> {
  if (hasAdminSessionCookie(request)) return true;
  const auth = await requireAdminUser(request);
  return auth.ok;
}
