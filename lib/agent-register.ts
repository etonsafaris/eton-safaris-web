import { supabase } from '@/lib/supabase/client';
import { pickString } from '@/lib/data';
import { saveWithColumnFallback, type SaveResult } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

const CANDIDATE_TABLES = ['registered_agents', 'Agent'] as const;

let resolvedTable: string | null = null;

function isMissingTable(message: string) {
  return /could not find the table|schema cache|relation .* does not exist/i.test(message);
}

function isDuplicateId(message: string) {
  return /duplicate key value violates unique constraint/i.test(message) && /pkey|_pkey/i.test(message);
}

function isDuplicateEmail(message: string) {
  return /duplicate key value violates unique constraint/i.test(message) && /email/i.test(message);
}

async function tableExists(table: string) {
  const { error } = await supabase.from(table).select('id').limit(1);
  return !error || !isMissingTable(error.message);
}

async function resolveAgentTable() {
  if (resolvedTable) return resolvedTable;
  for (const table of CANDIDATE_TABLES) {
    if (await tableExists(table)) {
      resolvedTable = table;
      return table;
    }
  }
  return null;
}

async function findAgentByEmail(email: string, table: string) {
  const needle = email.trim();
  if (!needle) return null;
  const { data, error } = await supabase.from(table).select('*').eq('email', needle).limit(1);
  if (error || !data?.[0]) return null;
  return data[0] as RecordRow;
}

async function nextAgentId(table: string): Promise<string | number> {
  const { data } = await supabase.from(table).select('id');
  const numbers = ((data as RecordRow[]) || [])
    .map((row) => Number(row.id))
    .filter((value) => Number.isFinite(value) && Number.isInteger(value) && value >= 0);
  if (numbers.length > 0) return Math.max(...numbers) + 1;
  return crypto.randomUUID();
}

async function insertInto(table: string, payload: Record<string, unknown>): Promise<SaveResult> {
  const body = { ...payload };
  delete body.id;

  let result = await saveWithColumnFallback(table, body);
  if (!result.error) return result;
  if (isMissingTable(result.error.message)) return result;

  if (isDuplicateEmail(result.error.message)) {
    const existing = await findAgentByEmail(String(payload.email || ''), table);
    if (existing) return { data: [existing], error: null };
  }

  if (!isDuplicateId(result.error.message)) return result;

  const nextId = await nextAgentId(table);
  result = await saveWithColumnFallback(table, { ...body, id: nextId }, { keepId: true });
  if (!result.error || !isDuplicateId(result.error.message)) return result;

  const laterId = typeof nextId === 'number' ? nextId + 1 : crypto.randomUUID();
  return saveWithColumnFallback(table, { ...body, id: laterId }, { keepId: true });
}

export async function saveAgentApplication(input: Record<string, unknown>): Promise<SaveResult & { alreadyExists?: boolean }> {
  const email = String(input.email || '').trim();
  const table = await resolveAgentTable();
  if (!table) {
    return { data: null, error: { message: 'The agent register is not available right now. Ask an administrator to check the agents table.' } };
  }

  const existing = await findAgentByEmail(email, table);
  if (existing) {
    return { data: [existing], error: null, alreadyExists: true };
  }

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

  const result = await insertInto(table, payload);
  if (result.error && isMissingTable(result.error.message)) {
    resolvedTable = null;
    return { data: null, error: { message: 'Could not save the agent application. Please try again.' } };
  }
  return result;
}

export function agentApplicationId(result: SaveResult) {
  const row = result.data?.[0] as RecordRow | undefined;
  return row ? pickString(row, ['id']) || String(row.id || '') : '';
}
