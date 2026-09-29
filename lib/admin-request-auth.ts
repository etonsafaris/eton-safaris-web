import { ADMIN_SESSION_COOKIE } from '@/lib/admin-session-cookie';
import { isOwnerAdminEmail } from '@/lib/inbox';
import { requireAdminUser } from '@/lib/require-admin';
import { decodeJwtPayload, emailFromJwtPayload } from '@/lib/supabase/jwt-payload';

/** HttpOnly flag set by POST /api/admin/session after Supabase sign-in. */
export function hasAdminSessionCookie(request: Request): boolean {
  const cookie = request.headers.get('cookie') || '';
  return cookie.split(';').some((part) => part.trim() === `${ADMIN_SESSION_COOKIE}=1`);
}

function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

/** Cookie (fast path) or valid Supabase bearer token (fallback when cookie expired). */
export async function allowAdminRequest(request: Request): Promise<boolean> {
  if (hasAdminSessionCookie(request)) return true;
  const token = bearerToken(request);
  if (token) {
    const email = emailFromJwtPayload(decodeJwtPayload(token));
    if (email && isOwnerAdminEmail(email)) return true;
  }
  const auth = await requireAdminUser(request);
  return auth.ok;
}
