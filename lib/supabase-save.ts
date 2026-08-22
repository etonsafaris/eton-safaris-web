import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '@/lib/supabase/client';
import {
  CONTENT_TABLES,
  getKnownColumns,
  normalizeColumnName,
  prepareMutationPayload,
  rememberKnownColumns,
  rememberMissingColumn,
} from '@/lib/supabase-payload';

export type SaveResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string; code?: string } | null;
};

export type SaveOptions = {
  id?: string | number | null;
  eq?: { column: string; value: string | number };
  client?: SupabaseClient;
  /** Keep `id` on insert (e.g. profiles keyed to auth.users). */
  keepId?: boolean;
};

function isSaveOptions(value: unknown): value is SaveOptions {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolveOptions(
  idOrOptions?: string | number | SaveOptions | null,
  client?: SupabaseClient
): Required<Pick<SaveOptions, 'client'>> & SaveOptions {
  if (isSaveOptions(idOrOptions)) {
    return { ...idOrOptions, client: idOrOptions.client || client || defaultClient };
  }
  return {
    id: idOrOptions ?? undefined,
    client: client || defaultClient,
  };
}

function hasRowFilter(options: SaveOptions): boolean {
  if (options.id !== undefined && options.id !== null && options.id !== '') return true;
  return Boolean(options.eq?.column);
}

export function parseMissingColumn(message: string): string | null {
  const match =
    message.match(/Could not find the '([^']+)' column of '[^']+' in the schema cache/i) ||
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column ["'`]([^"'`]+)["'`] of relation/i) ||
    message.match(/column ["'`]([^"'`]+)["'`]/i) ||
    message.match(/column \w+\.([a-z0-9_]+) does not exist/i);
  return match?.[1] ? normalizeColumnName(match[1]) : null;
}

function normalizePayload(payload: Record<string, unknown>, keepId = false): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    const key = normalizeColumnName(rawKey);
    if (!key) continue;
    if (key === 'id' && !keepId) continue;
    clean[key] = value === '' && !['title', 'name', 'slug', 'keyword', 'email'].includes(key) ? null : value;
  }
  return clean;
}

export async function discoverTableColumns(
  table: string,
  client: SupabaseClient = defaultClient
): Promise<string[]> {
  const cached = getKnownColumns(table);
  if (cached.length > 0) return cached;

  const { data, error } = await client.from(table).select('*').limit(1);
  if (error || !data?.[0]) return cached;

  const keys = Object.keys(data[0] as Record<string, unknown>);
  rememberKnownColumns(table, keys);
  return getKnownColumns(table);
}

async function refetchRow(
  table: string,
  options: SaveOptions,
  client: SupabaseClient
): Promise<Record<string, unknown>[] | null> {
  let query = client.from(table).select('*');
  if (options.id !== undefined && options.id !== null && options.id !== '') {
    query = query.eq('id', options.id);
  } else if (options.eq) {
    query = query.eq(options.eq.column, options.eq.value);
  } else {
    query = query.limit(1);
  }
  const { data } = await query;
  const rows = (data as Record<string, unknown>[] | null) || null;
  if (rows?.[0]) rememberKnownColumns(table, Object.keys(rows[0]));
  return rows;
}

export async function saveWithColumnFallback(
  table: string,
  payload: Record<string, unknown>,
  idOrOptions?: string | number | SaveOptions | null,
  clientArg?: SupabaseClient
): Promise<SaveResult> {
  const options = resolveOptions(idOrOptions, clientArg);
  const client = options.client || defaultClient;
  const isUpdate = hasRowFilter(options);

  if (isUpdate && (options.id === undefined || options.id === null || options.id === '') && !options.eq) {
    return { data: null, error: { message: 'Update requires .eq(\'id\', recordId).' } };
  }

  try {
    await discoverTableColumns(table, client);
  } catch (error) {
    console.error('[Supabase] Could not inspect table columns:', error);
  }

  const keepId = Boolean(options.keepId) && !isUpdate;
  let current = prepareMutationPayload(table, normalizePayload(payload, keepId), {
    knownColumns: getKnownColumns(table),
    keepId,
  });

  if (keepId && payload.id !== undefined && payload.id !== null && payload.id !== '') {
    current.id = payload.id;
  }

  if (
    !isUpdate &&
    CONTENT_TABLES.has(table) &&
    (current.published_at === undefined || current.published_at === null || current.published_at === '')
  ) {
    current.published_at = new Date().toISOString();
  }

  if (Object.keys(current).length === 0) {
    return { data: null, error: { message: 'Could not save this record. The table is missing the fields being sent.' } };
  }

  const seenFixes = new Set<string>();
  let lastWriteError = '';

  function applyErrorFix(message: string): Record<string, unknown> | null {
    const missing = parseMissingColumn(message);
    if (missing && missing in current) {
      rememberMissingColumn(table, missing);
      const next = { ...current };
      delete next[missing];
      return next;
    }

    if (/invalid input syntax for type json/i.test(message)) {
      const next = { ...current };
      let changed = false;
      for (const [key, value] of Object.entries(next)) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
              next[key] = JSON.parse(trimmed);
              changed = true;
            } catch {
              /* keep string */
            }
          }
        }
      }
      return changed ? next : null;
    }

    if (/is of type text|expected string|malformed array literal/i.test(message)) {
      const next = { ...current };
      let changed = false;
      for (const [key, value] of Object.entries(next)) {
        if (Array.isArray(value) || (value && typeof value === 'object')) {
          next[key] = JSON.stringify(value);
          changed = true;
        }
      }
      return changed ? next : null;
    }

    const notNull = message.match(/null value in column ["']?([a-z0-9_]+)/i);
    if (notNull?.[1]) {
      const column = normalizeColumnName(notNull[1]);
      const next = { ...current };
      if (column === 'featured') next[column] = true;
      else if (column === 'id') next[column] = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 9000);
      else if (column === 'status') next[column] = 'Published';
      else if (column === 'slug') next[column] = `item-${Date.now()}`;
      else if (/(_at|date)$/i.test(column)) next[column] = new Date().toISOString();
      else next[column] = String(next.title || next.name || 'Untitled');
      return next;
    }

    if (/duplicate key value violates unique constraint/i.test(message) && /pkey|_pkey/i.test(message)) {
      const next = { ...current };
      next.id = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 9000);
      return next;
    }

    if (/invalid input syntax for type uuid/i.test(message) && current.id != null) {
      const next = { ...current };
      next.id = crypto.randomUUID();
      return next;
    }

    if (/invalid input syntax for type (bigint|integer|numeric|double)/i.test(message)) {
      const next = { ...current };
      if (typeof next.id === 'string') {
        next.id = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 9000);
        return next;
      }
      let changed = false;
      for (const [key, value] of Object.entries(next)) {
        if (key === 'id' || key === 'phone' || key === 'email') continue;
        if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) {
            next[key] = parsed;
            changed = true;
          }
        }
      }
      return changed ? next : null;
    }

    return null;
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      const write = isUpdate ? client.from(table).update(current) : client.from(table).insert(current);
      const filtered = isUpdate
        ? options.id !== undefined && options.id !== null && options.id !== ''
          ? write.eq('id', options.id)
          : write.eq(options.eq!.column, options.eq!.value)
        : write;

      const selected = await filtered.select('*');
      if (!selected.error) {
        const rows = (selected.data as Record<string, unknown>[] | null) || [];
        if (rows[0]) rememberKnownColumns(table, Object.keys(rows[0]));
        return { data: rows, error: null };
      }

      lastWriteError = selected.error.message;
      const selectedFix = applyErrorFix(selected.error.message);
      const selectedKey = selectedFix ? `${selected.error.message}|${Object.keys(selectedFix).sort().join(',')}|${String(selectedFix.id ?? '')}` : '';
      if (selectedFix && Object.keys(selectedFix).length > 0 && selectedKey && !seenFixes.has(selectedKey)) {
        seenFixes.add(selectedKey);
        current = selectedFix;
        continue;
      }

      if (attempt < 2 && /failed to fetch|networkerror|load failed/i.test(selected.error.message)) {
        continue;
      }

      const writeOnly = isUpdate
        ? options.id !== undefined && options.id !== null && options.id !== ''
          ? await client.from(table).update(current).eq('id', options.id)
          : await client.from(table).update(current).eq(options.eq!.column, options.eq!.value)
        : await client.from(table).insert(current);

      if (!writeOnly.error) {
        const rows = await refetchRow(table, options, client);
        return { data: rows, error: null };
      }

      lastWriteError = writeOnly.error.message;
      const writeMissingFix = applyErrorFix(writeOnly.error.message);
      const writeKey = writeMissingFix
        ? `${writeOnly.error.message}|${Object.keys(writeMissingFix).sort().join(',')}|${String(writeMissingFix.id ?? '')}`
        : '';
      if (writeMissingFix && Object.keys(writeMissingFix).length > 0 && writeKey && !seenFixes.has(writeKey)) {
        seenFixes.add(writeKey);
        current = writeMissingFix;
        continue;
      }

      return { data: null, error: { message: writeOnly.error.message, code: writeOnly.error.code } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch';
      if (attempt < 2 && /failed to fetch|networkerror|load failed/i.test(message)) {
        continue;
      }
      return { data: null, error: { message } };
    }
  }

  return { data: null, error: { message: lastWriteError || 'Could not save this record.' } };
}
