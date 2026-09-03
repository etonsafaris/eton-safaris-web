type QueryResult = { data: any[] | null; error: { message: string } | null };
type AuthUser = { id: string; email: string; user_metadata?: Record<string, unknown> };
type AuthSession = { access_token: string; user: AuthUser };

const AUTH_STORAGE_KEY = 'eton-aiven-auth-token';

function storedSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as AuthUser;
    return { access_token: token, user: payload };
  } catch {
    return null;
  }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.session) {
        return { data: { session: null, user: null }, error: { message: body.error || 'Invalid email or password' } };
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_STORAGE_KEY, body.session.access_token);
      }
      return { data: body.session, error: null };
    },
    signOut: async () => {
      if (typeof window !== 'undefined') window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return { error: null };
    },
    onAuthStateChange: (callback: (event: string, session: AuthSession | null) => void) => ({
      // The compatibility client has no realtime channel; notify callers on subscription.
      callback,
      data: { subscription: { unsubscribe: () => undefined } },
    }),
  },
};
