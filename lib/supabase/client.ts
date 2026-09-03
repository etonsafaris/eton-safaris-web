type QueryResult = { data: any[] | null; error: { message: string } | null };

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
      .then(onfulfilled, onrejected);
  }
}

export const supabase = {
  from(table: string) { return new BrowserQuery(table); },
  auth: {
    getUser: async () => ({ data: { user: null as null }, error: null }),
    getSession: async () => ({ data: { session: null as { access_token?: string } | null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: (_callback: (event: string, session: null) => void) => ({
      data: { subscription: { unsubscribe: () => undefined } },
    }),
  },
};
