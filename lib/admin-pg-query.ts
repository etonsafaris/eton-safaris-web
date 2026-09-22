import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { NextResponse } from 'next/server';
import { withPgClient } from '@/lib/supabase/pool';

/**
 * Admin API helper — always releases the pool client (use instead of raw `pool.connect()`).
 */
export async function adminPgQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<QueryResult<T>> {
  return withPgClient((client) => client.query<T>(text, values));
}

export async function adminPgRows<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<T[]> {
  const result = await adminPgQuery<T>(text, values);
  return result.rows;
}

export async function withAdminPgClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return withPgClient(fn);
}

export function adminJsonRows<T>(rows: T[], init?: ResponseInit) {
  return NextResponse.json(rows, init);
}
