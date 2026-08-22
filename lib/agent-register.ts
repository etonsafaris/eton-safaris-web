import { supabase } from '@/lib/supabase/client';
import { pickString } from '@/lib/data';
import { parseMissingColumn, type SaveResult } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

const CANDIDATE_TABLES = ['Agent', 'registered_agents'] as const;

function isMissingTable(message: string) {
  return /could not find the table|schema cache|relation .* does not exist/i.test(message);
}

function isDuplicateId(message: string) {
  return /duplicate key value violates unique constraint/i.test(message) && /pkey|_pkey/i.test(message);
}

function isDuplicateEmail(message: string) {
  return /duplicate key value violates unique constraint/i.test(message) && /email/i.test(message);
}

function uniqueIntId() {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 9000) + 1000;
}

async function tableExists(table: string) {
  const { error } = await supabase.from(table).select('id').limit(1);
  return !error || !isMissingTable(error.message);
}

async function findAgentByEmail(email: string, table: string) {
  const needle = email.trim();
  if (!needle) return null;
  const { data, error } = await supabase.from(table).select('*').eq('email', needle).limit(1);
  if (error || !data?.[0]) return null;
  return data[0] as RecordRow;
}

async function insertAgentRow(table: string, payload: Record<string, unknown>): Promise<SaveResult> {
  let current: Record<string, unknown> = { ...payload };
  delete current.id;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { data, error } = await supabase.from(table).insert(current).select('*');
    if (!error) return { data: (data as Record<string, unknown>[]) || [], error: null };

    const message = error.message || '';
    if (isMissingTable(message)) return { data: null, error: { message } };

    if (isDuplicateEmail(message)) {
      const existing = await findAgentByEmail(String(payload.email || ''), table);
      if (existing) return { data: [existing], error: null };
      return { data: null, error: { message: 'This email is already registered as an agent.' } };
    }

    if (isDuplicateId(message)) {
      current = { ...current, id: uniqueIntId() + attempt };
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
      if (column === 'id') next.id = uniqueIntId() + attempt;
      else if (/(_at|date)$/i.test(column)) next[column] = new Date().toISOString();
      else if (column === 'status') next[column] = 'Pending';
      else if (column === 'created_by') next[column] = String(payload.email || 'agent');
      else next[column] = String(payload.name || payload.email || 'Agent');
      current = next;
      continue;
    }

    if (/invalid input syntax for type uuid/i.test(message)) {
      current = { ...current, id: crypto.randomUUID() };
      continue;
    }

    if (/invalid input syntax for type (integer|bigint|numeric)/i.test(message) && typeof current.id === 'string') {
      current = { ...current, id: uniqueIntId() + attempt };
      continue;
    }

    if (/integer out of range|value .* out of range/i.test(message) && current.id != null) {
      current = { ...current, id: uniqueIntId() + attempt };
      continue;
    }

    return { data: null, error: { message } };
  }

  return { data: null, error: { message: 'Could not save the agent application. Please try again.' } };
}

export async function saveAgentApplication(input: Record<string, unknown>): Promise<SaveResult & { alreadyExists?: boolean }> {
  const email = String(input.email || '').trim();
  const payload = {
    name: String(input.name || '').trim(),
    email,
    phone: String(input.phone || '').trim() || null,
    country: String(input.country || '').trim() || null,
    gender: String(input.gender || '').trim() || null,
    company: String(input.company || '').trim() || null,
    address: String(input.address || '').trim() || null,
    bio: String(input.bio || '').trim() || null,
    status: String(input.status || 'Pending').trim() || 'Pending',
  };

  const tables: string[] = [];
  for (const table of CANDIDATE_TABLES) {
    if (await tableExists(table)) tables.push(table);
  }
  if (tables.length === 0) {
    return { data: null, error: { message: 'The agent register is not available right now. Ask an administrator to check the agents table.' } };
  }

  for (const table of tables) {
    const existing = await findAgentByEmail(email, table);
    if (existing) return { data: [existing], error: null, alreadyExists: true };
  }

  let lastError: SaveResult['error'] = { message: 'Could not save the agent application.' };
  for (const table of tables) {
    const result = await insertAgentRow(table, payload);
    if (!result.error) return result;
    lastError = result.error;
    if (!isMissingTable(result.error.message)) return result;
  }

  if (lastError && isMissingTable(lastError.message)) {
    return { data: null, error: { message: 'Could not save the agent application. Please try again.' } };
  }
  return { data: null, error: lastError };
}

export function agentApplicationId(result: SaveResult) {
  const row = result.data?.[0] as RecordRow | undefined;
  return row ? pickString(row, ['id']) || String(row.id || '') : '';
}
