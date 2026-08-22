import type { SupabaseClient } from '@supabase/supabase-js';
import { createPrivilegedClient } from '@/lib/supabase/admin';
import {
  AGENT_TABLES,
  isDuplicateEmail,
  isDuplicateId,
  isDuplicateKey,
  isMissingTable,
  normalizeAgentEmail,
} from '@/lib/agent-tables';
import { parseMissingColumn, type SaveResult } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

type IdStrategy = 'auto' | 'integer' | 'uuid';

async function tableExists(client: SupabaseClient, table: string) {
  const { error } = await client.from(table).select('id').limit(1);
  return !error || !isMissingTable(error.message);
}

async function findAgentByEmail(client: SupabaseClient, table: string, email: string) {
  const needle = email.trim();
  if (!needle) return null;
  const { data, error } = await client.from(table).select('*').ilike('email', needle).limit(8);
  if (error || !data?.length) return null;
  const match =
    (data as RecordRow[]).find((row) => normalizeAgentEmail(row.email ?? row.Email) === normalizeAgentEmail(needle)) ||
    (data[0] as RecordRow);
  return match || null;
}

async function nextIntegerId(client: SupabaseClient, table: string) {
  const { data } = await client.from(table).select('id').order('id', { ascending: false }).limit(1);
  const max = Number((data?.[0] as { id?: unknown } | undefined)?.id);
  if (Number.isFinite(max) && max >= 1) return Math.min(Math.floor(max) + 1, 2147483646);
  return Math.floor(Date.now() / 1000) % 2000000000;
}

function buildPayload(input: Record<string, unknown>) {
  const now = new Date().toISOString();
  const email = String(input.email || '').trim();
  return {
    name: String(input.name || '').trim(),
    email,
    phone: String(input.phone || '').trim() || null,
    country: String(input.country || '').trim() || null,
    gender: String(input.gender || '').trim() || null,
    company: String(input.company || '').trim() || null,
    address: String(input.address || '').trim() || null,
    bio: String(input.bio || '').trim() || null,
    status: String(input.status || 'Pending').trim() || 'Pending',
    created_date: now,
    updated_date: now,
    created_at: now,
    updated_at: now,
    created_by: email || 'agent-register',
  };
}

async function insertAgentRow(
  client: SupabaseClient,
  table: string,
  payload: Record<string, unknown>
): Promise<SaveResult> {
  let current: Record<string, unknown> = { ...payload };
  let strategy: IdStrategy = 'auto';
  let nextId = 0;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const row = { ...current };
    if (strategy === 'auto') delete row.id;
    if (strategy === 'integer') {
      if (!nextId) nextId = await nextIntegerId(client, table);
      row.id = nextId + attempt;
    }
    if (strategy === 'uuid') row.id = crypto.randomUUID();

    const written = await client.from(table).insert(row);
    if (!written.error) {
      const saved =
        (await findAgentByEmail(client, table, String(payload.email || ''))) ||
        ({ ...row, id: row.id } as RecordRow);
      return { data: [saved], error: null };
    }

    const message = written.error.message || '';
    console.error(`[Agent register] ${table} insert failed:`, message, { strategy, attempt, id: row.id });

    if (isMissingTable(message)) return { data: null, error: { message } };

    if (isDuplicateEmail(message) || (isDuplicateKey(message) && !isDuplicateId(message))) {
      const existing = await findAgentByEmail(client, table, String(payload.email || ''));
      if (existing) return { data: [existing], error: null };
      if (isDuplicateEmail(message)) {
        return { data: null, error: { message: 'This email is already registered as an agent.' } };
      }
    }

    if (isDuplicateId(message)) {
      if (strategy !== 'uuid') {
        strategy = 'integer';
        nextId = (await nextIntegerId(client, table)) + attempt + 1;
      } else {
        strategy = 'uuid';
      }
      continue;
    }

    if (/cannot insert a non-DEFAULT value into column ["']?id/i.test(message)) {
      strategy = 'auto';
      const next = { ...current };
      delete next.id;
      current = next;
      continue;
    }

    if (/invalid input syntax for type uuid/i.test(message)) {
      strategy = 'uuid';
      continue;
    }

    if (/invalid input syntax for type (integer|bigint|numeric)/i.test(message)) {
      if (strategy === 'uuid') {
        const next = { ...current };
        delete next.id;
        current = next;
        strategy = 'auto';
        continue;
      }
      strategy = 'integer';
      nextId = await nextIntegerId(client, table);
      continue;
    }

    const missing = parseMissingColumn(message);
    if (missing && missing in current) {
      const next = { ...current };
      delete next[missing];
      current = next;
      continue;
    }

    const notNull = message.match(/null value in column ["']?([a-zA-Z0-9_]+)/i);
    if (notNull?.[1]) {
      const column = notNull[1];
      const next = { ...current };
      if (column === 'id') {
        strategy = strategy === 'uuid' ? 'uuid' : 'integer';
        nextId = nextId || (await nextIntegerId(client, table));
      } else if (/(_at|date)$/i.test(column)) next[column] = new Date().toISOString();
      else if (column === 'status') next[column] = 'Pending';
      else if (column === 'created_by') next[column] = String(payload.email || 'agent');
      else next[column] = String(payload.name || payload.email || 'Agent');
      current = next;
      continue;
    }

    return { data: null, error: { message } };
  }

  return { data: null, error: { message: `Could not save the agent application to ${table}.` } };
}

export async function saveAgentApplicationOnServer(
  input: Record<string, unknown>
): Promise<SaveResult & { alreadyExists?: boolean; table?: string }> {
  const payload = buildPayload(input);
  const email = String(payload.email || '');
  if (!email.includes('@') || !String(payload.name || '').trim()) {
    return { data: null, error: { message: 'Name and email are required.' } };
  }

  const client = createPrivilegedClient();
  const tables: string[] = [];
  for (const table of AGENT_TABLES) {
    if (await tableExists(client, table)) tables.push(table);
  }
  if (tables.length === 0) {
    return {
      data: null,
      error: {
        message:
          'The agent register is not available. Run scripts/fix-agent-register.sql in the Supabase SQL editor.',
      },
    };
  }

  for (const table of tables) {
    const existing = await findAgentByEmail(client, table, email);
    if (existing) return { data: [existing], error: null, alreadyExists: true, table };
  }

  let lastError: SaveResult['error'] = { message: 'Could not save the agent application.' };
  for (const table of tables) {
    const result = await insertAgentRow(client, table, payload);
    if (!result.error) return { ...result, table };
    lastError = result.error;
    if (/already registered as an agent/i.test(result.error.message)) return result;
  }

  return { data: null, error: lastError };
}
