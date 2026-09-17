// Aiven PostgreSQL admin client for elevated operations
import { db } from '@/lib/supabase/pool';

function missingSelectColumn(message?: string) {
  const text = String(message || '');
  const match =
    text.match(/Could not find the '([^']+)' column/i) ||
    text.match(/column ["'`]([^"'`.]+)["'`]/i) ||
    text.match(/column (?:[\w]+\.)?([A-Za-z_][\w]*) does not exist/i);
  return match?.[1] || null;
}

function dropColumnFromSelect(columns: string, column: string) {
  return columns
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && part !== column && part !== '*')
    .join(',');
}

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
    this._orFilters = [];
    this._data = null;
    this._operation = 'select';
  }

  private _select: string;
  private _filters: { column: string; operator: string; value: any }[];
  private _orFilters: { column: string; operator: string; value: any }[][];
  private _data: Record<string, any> | null;
  private _operation: 'select' | 'insert' | 'update' | 'delete';
  private _limit: number | null = null;

  select(columns: string) {
    this._select = columns;
    return this;
  }

  eq(column: string, value: any) {
    this._filters.push({ column, operator: '=', value });
    return this;
  }

  neq(column: string, value: any) {
    this._filters.push({ column, operator: '!=', value });
    return this;
  }

  ilike(column: string, value: any) {
    this._filters.push({ column, operator: 'ILIKE', value });
    return this;
  }

  gt(column: string, value: any) {
    this._filters.push({ column, operator: '>', value });
    return this;
  }

  lt(column: string, value: any) {
    this._filters.push({ column, operator: '<', value });
    return this;
  }

  gte(column: string, value: any) {
    this._filters.push({ column, operator: '>=', value });
    return this;
  }

  lte(column: string, value: any) {
    this._filters.push({ column, operator: '<=', value });
    return this;
  }

  or(filters: { column: string; operator?: string; value: any }[]) {
    const normalized = filters.map((f) => ({
      column: f.column,
      operator: f.operator || '=',
      value: f.value,
    }));
    this._orFilters.push(normalized);
    return this;
  }

  limit(n: number) {
    this._limit = n;
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

  single() {
    return this.then((result: { data: any[] | null; error: { message: string } | null }) => ({
      data: result.data?.[0] || null,
      error: result.error,
    }));
  }

  async execute(): Promise<{ data: any[] | null; error: { message: string } | null }> {
    let client;
    try {
      client = await db.connect();
      let query = '';
      const params: any[] = [];
      let paramIndex = 1;
      const buildWhere = () => this.buildFullWhere(params, () => paramIndex++);

      if (this._operation === 'delete') {
        query = `DELETE FROM ${this.table}`;
        const where = buildWhere();
        if (where) query += ` WHERE ${where}`;
        query += ' RETURNING *';
      } else if (this._data) {
        const columns = Object.keys(this._data);
        const values = Object.values(this._data);

        if (this._filters.length > 0 || this._orFilters.length > 0) {
          const setClause = columns.map((col) => `${col} = $${paramIndex++}`).join(', ');
          const where = buildWhere();
          query = `UPDATE ${this.table} SET ${setClause} WHERE ${where} RETURNING *`;
          params.unshift(...values);
        } else {
          const placeholders = columns.map(() => `$${paramIndex++}`).join(', ');
          query = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
          params.push(...values);
        }
      } else {
        query = `SELECT ${this._select} FROM ${this.table}`;
        const where = buildWhere();
        if (where) query += ` WHERE ${where}`;
      }

      if (this._orderBy && this._operation === 'select') {
        query += ` ORDER BY ${this._orderBy.column} ${this._orderBy.ascending ? 'ASC' : 'DESC'}`;
      }

      if (this._limit && this._operation === 'select') {
        query += ` LIMIT ${Number(this._limit)}`;
      }

      const result = await client.query(query, params);
      return { data: result.rows, error: null };
    } catch (error: any) {
      const missing =
        this._operation === 'select' && this._select !== '*'
          ? missingSelectColumn(error.message)
          : null;
      if (missing && this._select.split(',').map((part) => part.trim()).includes(missing)) {
        const next = dropColumnFromSelect(this._select, missing);
        if (next && next !== this._select) {
          this._select = next;
          client?.release();
          client = undefined;
          return this.execute();
        }
      }
      console.error(`[Aiven Admin] Query error on ${this.table}:`, error.message);
      return { data: null, error: { message: error.message } };
    } finally {
      client?.release();
    }
  }

  private renderFilter(
    filter: { column: string; operator: string; value: any },
    params: any[],
    nextParam: () => number,
  ): string {
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
  }

  private buildFullWhere(params: any[], nextParam: () => number): string {
    const andParts = this._filters.map((f) => this.renderFilter(f, params, nextParam));
    const orParts = this._orFilters.map((group) => {
      const inner = group.map((f) => this.renderFilter(f, params, nextParam)).join(' OR ');
      return group.length > 1 ? `(${inner})` : inner;
    });
    const all = [...andParts, ...orParts].filter(Boolean);
    return all.length ? all.join(' AND ') : '';
  }

  then<TResult1 = { data: any[] | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}