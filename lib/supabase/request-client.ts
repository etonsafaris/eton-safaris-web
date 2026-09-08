// Aiven PostgreSQL request client for API routes
import { db } from '@/lib/supabase/pool';
import { createAdminClient } from '@/lib/supabase/admin';

export function hasServiceRoleKey() {
  // Aiven uses DATABASE_URL with full permissions
  return Boolean(process.env.DATABASE_URL);
}

export function bearerTokenFromRequest(request: Request) {
  const header = request.headers.get('authorization') || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

export function isRlsError(message?: string) {
  // Aiven doesn't have RLS, but we keep this for compatibility
  return /permission denied|42501|not allowed/i.test(message || '');
}

export function rlsHelpMessage(action: string) {
  return `${action} requires valid DATABASE_URL credentials.`;
}

/** Aiven write client - always uses database with full permissions */
export function createWriteClient(accessToken?: string) {
  // Aiven doesn't need RLS - all connections use DATABASE_URL with full permissions
  return createAdminClient();
}