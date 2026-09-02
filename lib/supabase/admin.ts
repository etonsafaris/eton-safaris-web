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
    this._filters: { column: string; operator: string; value: any }[] = [];
    this._data: Record<string, any> | null = null;
  }

  private _select: string;
  private _filters: { column: string; operator: string; value: any }[];
  private _data: Record<string, any> | null;

  select(columns: string) {
    this._select = columns;
    return this;
  }

  eq(column: string, value: any) {
    this._filters.push({ column, operator: '=', value });
    return this;
  }

  update(data: Record<string, any>) {
    this._data = data;
    return this;
  }

  insert(data: Record<string, any>) {
    this._data = data;
    return this;
  }

  delete() {
    return this;
  }

  async execute() {
    try {
      const client = await db.connect();
      let query = '';
      const params: any[] = [];
      let paramIndex = 1;

      if (this._data) {
        // INSERT or UPDATE
        const columns = Object.keys(this._data);
        const values = Object.values(this._data);
        
        if (this._filters.length > 0) {
          // UPDATE
          const setClause = columns.map((col, i) => `${col} = $${paramIndex++}`).join(', ');
          const whereClause = this._filters.map(f => {
            params.push(f.value);
            return `${f.column} ${f.operator} $${paramIndex++}`;
          }).join(' AND ');
          
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
        const whereClause = this._filters.map(f => {
          params.push(f.value);
          return `${f.column} ${f.operator} $${paramIndex++}`;
        }).join(' AND ');
        query += ` WHERE ${whereClause}`;
      } else {
        // SELECT all
        query = `SELECT ${this._select} FROM ${this.table}`;
      }

      const result = await client.query(query, params);
      client.release();
      
      return { data: result.rows, error: null };
    } catch (error: any) {
      console.error(`[Aiven Admin] Query error on ${this.table}:`, error.message);
      return { data: null, error: { message: error.message } };
    }
  }

  async then(onfulfilled?: any, onrejected?: any) {
    const result = await this.execute();
    if (onfulfilled) return onfulfilled(result);
    return result;
  }
}