// Aiven PostgreSQL wrapper that mimics Supabase client API for frontend compatibility
// This allows existing frontend components to work without major refactoring

// Browser-safe compatibility surface. Database credentials stay server-side.
type QueryResult = { data: unknown[]; error: { message: string } | null };

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

  then(onfulfilled?: (result: QueryResult) => unknown) {
    return fetch(`/api/data/${encodeURIComponent(this.table)}?${this.params}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        return {
          data: Array.isArray(body.data) ? body.data : [],
          error: response.ok ? null : { message: body.error || 'Database request failed' },
        };
      })
      .then((result) => onfulfilled ? onfulfilled(result) : result);
  }
}

export const supabase = {
  from(table: string) { return new BrowserQuery(table); },
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  },
};



// Mock Supabase client interface for frontend compatibility
class AivenClient {
  constructor() {
    this._isServer = typeof window === 'undefined';
  }

  // Mimic Supabase's from() method
  from(table: string) {
    return new AivenTableQuery(table, this._isServer);
  }

  // Auth methods (stubs for compatibility)
  auth = {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  };
}

class AivenTableQuery {
  constructor(private table: string, private isServer: boolean) {
    this._select = '*';
    this._filters: { column: string; operator: string; value: any }[] = [];
    this._orderBy: { column: string; ascending: boolean } | null = null;
    this._limit: number | null = null;
    this._offset: number | null = null;
    this._range: { start: number; end: number } | null = null;
  }

  private _select: string;
  private _filters: { column: string; operator: string; value: any }[];
  private _orderBy: { column: string; ascending: boolean } | null;
  private _limit: number | null;
  private _offset: number | null;
  private _range: { start: number; end: number } | null;

  select(columns: string) {
    this._select = columns;
    return this;
  }

  eq(column: string, value: any) {
    this._filters.push({ column, operator: '=', value });
    return this;
  }

  ilike(column: string, value: any) {
    this._filters.push({ column, operator: 'ILIKE', value });
    return this;
  }

  or(filters: string) {
    // Simplified OR handling - parse complex filters
    const orConditions = filters.split(',').map(f => {
      const match = f.match(/(\w+)\.(\w+)\.([^)]+)/);
      if (match) {
        return { column: match[1], operator: match[2], value: match[3] };
      }
      return null;
    }).filter(Boolean);
    
    orConditions.forEach((cond: any) => {
      if (cond) this._filters.push(cond);
    });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this._orderBy = { column, ascending: options.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this._limit = count;
    return this;
  }

  range(start: number, end: number) {
    this._range = { start, end };
    return this;
  }

  async execute() {
    if (!this.isServer) {
      // Client-side: return empty data for now
      return { data: [], error: null };
    }

    try {
      const client = await db.connect();
      let query = `SELECT ${this._select} FROM ${this.table}`;
      const params: any[] = [];
      let paramIndex = 1;

      // Build WHERE clause
      if (this._filters.length > 0) {
        const conditions = this._filters.map(f => {
          if (f.operator === 'ILIKE') {
            params.push(f.value);
            return `${f.column} ILIKE $${paramIndex++}`;
          } else if (f.operator === '=') {
            params.push(f.value);
            return `${f.column} = $${paramIndex++}`;
          }
          return '';
        }).filter(Boolean);
        
        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' OR ')}`;
        }
      }

      // ORDER BY
      if (this._orderBy) {
        query += ` ORDER BY ${this._orderBy.column} ${this._orderBy.ascending ? 'ASC' : 'DESC'}`;
      }

      // LIMIT and OFFSET
      if (this._range) {
        query += ` OFFSET ${this._range.start} LIMIT ${this._range.end - this._range.start + 1}`;
      } else if (this._limit) {
        query += ` LIMIT ${this._limit}`;
      } else if (this._offset) {
        query += ` OFFSET ${this._offset}`;
      }

      const result = await client.query(query, params);
      client.release();
      
      return { data: result.rows, error: null };
    } catch (error: any) {
      console.error(`[Aiven] Query error on ${this.table}:`, error.message);
      return { data: null, error: { message: error.message } };
    }
  }

  async then(onfulfilled?: any, onrejected?: any) {
    const result = await this.execute();
    if (onfulfilled) return onfulfilled(result);
    return result;
  }
}

// Create singleton instance
export const supabase = new AivenClient();