// Aiven PostgreSQL admin client for elevated operations
import { db } from '@/lib/supabase/server.ts/server';

export function createAdminClient() {
  // Aiven uses the same pool with elevated privileges via DATABASE_URL
  // No separate admin client needed - same connection with write permissions
  return {
    from: (table: string) => new AivenAdminTableQuery(table),
  };
}

export function createPrivilegedClient() {
  return createAdminClient();
}

export function createServiceClient() {
  return createAdminClient();
}

class AivenAdminTableQuery {
  constructor(private table: string) {
    this._select = '*';
    this._filters = [];
    this._data = null;
    this._operation = 'select';
  }

  private _select: string;
  private _filters: { column: string; operator: string; value: any }[];
  private _data: Record<string, any> | null;
  private _operation: 'select' | 'insert' | 'update' | 'delete';

  select(columns: string) {
    this._select = columns;
    return this;
  }

  eq(column: string, value: any) {
    this._filters.push({ column, operator: '=', value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this._orderBy = { column, ascending: options.ascending !== false };
    return this;
  }

  private _orderBy: { column: string; ascending: boolean } | null = null;

  update(data: Record<string, any>) {
    this._operation = 'update';
    this._data = data;
    return this;
  }

  insert(data: Record<string, any>) {
    this._operation = 'insert';
    this._data = data;
    return this;
  }

  delete() {
    this._operation = 'delete';
    this._data = null;
    return this;
  }

  in(column: string, values: unknown[]) {
    this._filters.push({ column, operator: 'IN', value: values });
    return this;
  }

  maybeSingle() {
    return this.then((result: { data: any[] | null; error: { message: string } | null }) => ({
      data: result.data?.[0] || null,
      error: result.error,
    }));
  }

  async execute() {
    let client;
    try {
      client = await db.connect();
      let query = '';
      const params: any[] = [];
      let paramIndex = 1;

      if (this._operation === 'delete') {
        query = `DELETE FROM ${this.table}`;
        if (this._filters.length > 0) {
          query += ` WHERE ${this.whereClause(params, () => paramIndex++)}`;
        }
        query += ' RETURNING *';
      } else if (this._data) {
        // INSERT or UPDATE
        const columns = Object.keys(this._data);
        const values = Object.values(this._data);
        
        if (this._filters.length > 0) {
          // UPDATE
          const setClause = columns.map((col, i) => `${col} = $${paramIndex++}`).join(', ');
          const whereClause = this.whereClause(params, () => paramIndex++);
          
          query = `UPDATE ${this.table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
          params.unshift(...values);
        } else {
          // INSERT
          const placeholders = columns.map(() => `$${paramIndex++}`).join(', ');
          query = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
          params.push(...values);
        }
      } else if (this._filters.length > 0) {
        // SELECT with filters
        query = `SELECT ${this._select} FROM ${this.table}`;
        const whereClause = this.whereClause(params, () => paramIndex++);
        query += ` WHERE ${whereClause}`;
      } else {
        // SELECT all
        query = `SELECT ${this._select} FROM ${this.table}`;
      }

      if (this._orderBy && this._operation === 'select') {
        query += ` ORDER BY ${this._orderBy.column} ${this._orderBy.ascending ? 'ASC' : 'DESC'}`;
      }

      const result = await client.query(query, params);
      return { data: result.rows, error: null };
    } catch (error: any) {
      console.error(`[Aiven Admin] Query error on ${this.table}:`, error.message);
      return { data: null, error: { message: error.message } };
    } finally {
      client?.release();
    }
  }

  private whereClause(params: any[], nextParam: () => number) {
    return this._filters.map((filter) => {
      if (filter.operator === 'IN') {
        const values = Array.isArray(filter.value) ? filter.value : [];
        if (values.length === 0) return 'FALSE';
        const placeholders = values.map((value) => {
          params.push(value);
          return `$${nextParam()}`;
        });
        return `${filter.column} IN (${placeholders.join(', ')})`;
      }
      params.push(filter.value);
      return `${filter.column} ${filter.operator} $${nextParam()}`;
    }).join(' AND ');
  }

  then<TResult1 = { data: any[] | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}