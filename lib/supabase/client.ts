import { decodeJwtPayload, emailFromJwtPayload } from '@/lib/supabase/jwt-payload';

type QueryResult = { data: any[] | null; error: { message: string } | null };
type AuthUser = { id: string; email: string; user_metadata?: Record<string, unknown> };
type AuthSession = { access_token: string; user: AuthUser };

const AUTH_STORAGE_KEY = 'eton-aiven-auth-token';

function userFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const email = emailFromJwtPayload(payload);
  const id = String(payload.sub || payload.id || '').trim();
  if (!id || !email) return null;
  const meta = payload.user_metadata;
  return {
    id,
    email,
    user_metadata:
      meta && typeof meta === 'object' && !Array.isArray(meta)
        ? (meta as Record<string, unknown>)
        : undefined,
  };
}

function storedSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) return null;
    const user = userFromToken(token);
    if (!user) return null;
    return { access_token: token, user };
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  if (typeof window === 'undefined') return;
  if (!session?.access_token) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, session.access_token);
}

class BrowserQuery {
  private params = new URLSearchParams();
  constructor(private readonly table: string) {}
  select(columns: string) { this.params.set('select', columns); return this; }
  eq(column: string, value: unknown) { this.params.set(`eq.${column}`, String(value)); return this; }
  ilike(column: string, value: unknown) { this.params.set(`ilike.${column}`, String(value)); return this; }
  limit(count: number) { this.params.set('limit', String(count)); return this; }
  range(start: number, end: number) { this.params.set('range', `${start}-${end}`); return this; }
  order(column: string, options: { ascending?: boolean } = {}) {
    this.params.set('order', `${column}.${options.ascending === false ? 'desc' : 'asc'}`);
    return this;
  }
  maybeSingle() {
    return this.then((result) => ({ data: result.data?.[0] || null, error: result.error }));
  }
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((result: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return fetch(`/api/data/${encodeURIComponent(this.table)}?${this.params}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        return {
          data: Array.isArray(body.data) ? body.data : [],
          error: response.ok ? null : { message: body.error || 'Database request failed' },
        };
      })
      .catch((reason) => ({
        data: [],
        error: { message: reason instanceof Error ? reason.message : 'Database request failed' },
      }))
      .then(onfulfilled, onrejected);
  }
}

export const supabase = {
  from(table: string) { return new BrowserQuery(table); },
  auth: {
    getUser: async () => ({ data: { user: storedSession()?.user || null }, error: null }),
    getSession: async () => ({ data: { session: storedSession() }, error: null }),
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.session) {
        return { data: { session: null, user: null }, error: { message: body.error || 'Invalid email or password' } };
      }
      persistSession(body.session as AuthSession);
      return { data: body.session, error: null };
    },
    updateUser: async (updates: {
      email?: string;
      password?: string;
      data?: Record<string, unknown>;
    }) => {
      const token = storedSession()?.access_token || '';
      const response = await fetch('/api/auth/update-user', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          data: { user: null },
          error: { message: String(body.error || 'Could not update account') },
        };
      }
      if (body.session?.access_token && body.user) {
        persistSession({ access_token: body.session.access_token, user: body.user as AuthUser });
      }
      return { data: { user: body.user || null }, error: null };
    },
    resetPasswordForEmail: async (
      email: string,
      _options?: { redirectTo?: string }
    ) => {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { data: {}, error: { message: String(body.error || 'Could not send the reset email.') } };
      }
      return { data: body, error: null };
    },
    signUp: async ({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }) => {
      const id = `agent-${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const user: AuthUser = {
        id,
        email: email.trim().toLowerCase(),
        user_metadata: options?.data || {},
      };
      return { data: { user, session: null }, error: null };
    },
    signOut: async () => {
      persistSession(null);
      if (typeof window !== 'undefined') {
        for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
          const key = window.localStorage.key(index);
          if (key && (/auth-token/i.test(key) || key === AUTH_STORAGE_KEY)) {
            window.localStorage.removeItem(key);
          }
        }
      }
      return { error: null };
    },
    onAuthStateChange: (callback: (event: string, session: AuthSession | null) => void) => ({
      // The compatibility client has no realtime channel; notify callers on subscription.
      callback,
      data: { subscription: { unsubscribe: () => undefined } },
    }),
  },
};
