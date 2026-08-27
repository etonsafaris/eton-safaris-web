/** Decode a JWT payload in browser or Node without verifying the signature. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    let json = '';
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(padded, 'base64').toString('utf8');
    } else if (typeof atob === 'function') {
      json = decodeURIComponent(
        atob(padded)
          .split('')
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      );
    } else {
      return null;
    }
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function emailFromJwtPayload(payload: Record<string, unknown> | null) {
  const email = String(payload?.email || '').trim();
  if (email.includes('@')) return email;
  const meta = payload?.user_metadata;
  if (meta && typeof meta === 'object' && 'email' in meta) {
    const nested = String((meta as { email?: string }).email || '').trim();
    if (nested.includes('@')) return nested;
  }
  return '';
}

/** Read the persisted Supabase access token when getSession() rejects a future iat. */
export function readStoredAccessToken(fallback = '') {
  if (fallback) return fallback;
  if (typeof window === 'undefined') return '';
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !/auth-token/i.test(key)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as {
        access_token?: string;
        currentSession?: { access_token?: string };
      };
      const token = parsed.access_token || parsed.currentSession?.access_token || '';
      if (token) return token;
    }
  } catch {
    /* ignore */
  }
  return '';
}
