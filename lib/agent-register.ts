import { supabase } from '@/lib/supabase/client';
import { pickString } from '@/lib/data';
import { saveWithColumnFallback, type SaveResult } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

const AGENT_TABLES = ['registered_agents', 'Agent', 'agents'] as const;

function isMissingTable(message: string) {
  return /could not find the table|schema cache|does not exist/i.test(message);
}

function isDuplicateId(message: string) {
  return /duplicate key value violates unique constraint/i.test(message) && /pkey|_pkey/i.test(message);
}

function isDuplicateEmail(message: string) {
  return /duplicate key value violates unique constraint/i.test(message) && /email/i.test(message);
}

async function findAgentByEmail(email: string) {
  const needle = email.trim();
  if (!needle) return null;
  for (const table of AGENT_TABLES) {
    const { data, error } = await supabase.from(table).select('*').eq('email', needle).limit(1);
    if (error || !data?.[0]) continue;
    return { table, row: data[0] as RecordRow };
  }
  return null;
}

async function nextAgentId(table: string): Promise<string | number> {
  const { data } = await supabase.from(table).select('id');
  const rows = (data as RecordRow[]) || [];
  const numbers = rows
    .map((row) => Number(row.id))
    .filter((value) => Number.isFinite(value) && value >= 0 && Number.isInteger(value));
  if (numbers.length > 0) return Math.max(...numbers) + 1;
  return crypto.randomUUID();
}

async function insertAgent(table: string, payload: Record<string, unknown>): Promise<SaveResult> {
  const body = { ...payload };
  delete body.id;

  let result = await saveWithColumnFallback(table, body);
  if (!result.error) return result;

  if (isDuplicateEmail(result.error.message)) {
    const existing = await findAgentByEmail(String(payload.email || ''));
    if (existing) return { data: [existing.row], error: null };
  }

  if (!isDuplicateId(result.error.message)) return result;

  result = await saveWithColumnFallback(table, body);
  if (!result.error) return result;

  const nextId = await nextAgentId(table);
  return saveWithColumnFallback(table, { ...body, id: nextId }, { keepId: true });
}

export async function saveAgentApplication(input: Record<string, unknown>): Promise<SaveResult & { alreadyExists?: boolean }> {
  const email = String(input.email || '').trim();
  const existing = await findAgentByEmail(email);
  if (existing) {
    return { data: [existing.row], error: null, alreadyExists: true };
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

  let lastError: SaveResult['error'] = { message: 'Could not save the agent application.' };
  for (const table of AGENT_TABLES) {
    const result = await insertAgent(table, payload);
    if (!result.error) return result;
    lastError = result.error;
    if (!isMissingTable(result.error.message) && !isDuplicateId(result.error.message)) {
      return result;
    }
  }

  return { data: null, error: lastError };
}

export function agentApplicationId(result: SaveResult) {
  const row = result.data?.[0] as RecordRow | undefined;
  return row ? pickString(row, ['id']) || String(row.id || '') : '';
}
