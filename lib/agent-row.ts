import type { SupabaseClient } from '@supabase/supabase-js';
import { isDuplicateEmail, isDuplicateId, isMissingTable } from '@/lib/agent-tables';
import { parseMissingColumn, type SaveResult } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

/** Columns that exist on the live registered_agents table. */
export const LIVE_AGENT_COLUMNS = [
  'name',
  'username',
  'email',
  'phone',
  'country',
  'gender',
  'company',
  'company_website',
  'address',
  'bio',
  'status',
  'role',
  'user_id',
  'approval_token',
  'photo_url',
  'is_sample',
  'is_active',
] as const;

const FIELD_ALIASES: Record<string, string[]> = {
  username: ['username', 'name', 'full_name', 'Name'],
  email: ['email', 'Email'],
  phoneNumber: ['phoneNumber', 'phone', 'phone_number'],
  country: ['country', 'Country'],
  companyName: ['companyName', 'company', 'company_name'],
  companyWebsite: ['companyWebsite', 'company_website', 'website'],
  gender: ['gender'],
  bio: ['bio'],
  address: ['address'],
  isActive: ['isActive', 'is_active'],
  status: ['status'],
  role: ['role'],
  user_id: ['user_id', 'userId'],
};

export type AgentApplicationInput = {
  name: string;
  email: string;
  phone?: string;
  country?: string;
  company?: string;
  company_website?: string;
  gender?: string;
  bio?: string;
  address?: string;
  password?: string;
  user_id?: string;
  role?: string;
};

function pickColumn(known: string[], aliases: string[]) {
  const byLower = new Map(known.map((column) => [column.toLowerCase(), column]));
  for (const alias of aliases) {
    const hit = byLower.get(alias.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function deleteKeyInsensitive(row: Record<string, unknown>, key: string) {
  const needle = key.toLowerCase();
  for (const current of Object.keys(row)) {
    if (current.toLowerCase() === needle) delete row[current];
  }
}

export function buildLiveAgentInsert(input: AgentApplicationInput, userId?: string) {
  return {
    name: input.name.trim(),
    username: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    country: input.country?.trim() || null,
    gender: input.gender?.trim() || null,
    company: input.company?.trim() || null,
    company_website: input.company_website?.trim() || null,
    address: input.address?.trim() || null,
    bio: input.bio?.trim() || null,
    status: 'Pending',
    role: input.role?.trim() || 'Travel Agent',
    user_id: userId || input.user_id || crypto.randomUUID(),
    approval_token: crypto.randomUUID(),
    is_sample: false,
    is_active: false,
  };
}

export async function discoverAgentColumns(client: SupabaseClient, table: string): Promise<string[]> {
  const { data } = await client.from(table).select('*').limit(1);
  if (data?.[0]) return Object.keys(data[0] as Record<string, unknown>);
  if (table === 'registered_agents') return [...LIVE_AGENT_COLUMNS];
  return [];
}

export function buildAgentPayload(
  input: AgentApplicationInput | Record<string, unknown>,
  knownColumns: string[],
  options?: { active?: boolean; userId?: string }
) {
  const parsed: AgentApplicationInput = {
    name: String(input.name || input.username || '').trim(),
    email: String(input.email || '').trim(),
    phone: String(input.phone || input.phoneNumber || '').trim(),
    country: String(input.country || '').trim(),
    company: String(input.company || input.companyName || '').trim(),
    company_website: String(input.company_website || input.companyWebsite || '').trim(),
    gender: String(input.gender || '').trim(),
    bio: String(input.bio || '').trim(),
    address: String(input.address || '').trim(),
    user_id: String(input.user_id || options?.userId || '').trim(),
  };
  const live = buildLiveAgentInsert(parsed, options?.userId);
  const values: Record<string, unknown> = {
    username: live.name,
    email: live.email,
    phoneNumber: live.phone,
    country: live.country,
    companyName: parsed.company,
    companyWebsite: parsed.company_website,
    gender: live.gender,
    bio: live.bio,
    address: parsed.address,
    isActive: Boolean(options?.active),
    status: options?.active ? 'Active' : 'Pending',
    role: 'Travel Agent',
    user_id: live.user_id,
  };

  const payload: Record<string, unknown> = {};
  for (const [logical, aliases] of Object.entries(FIELD_ALIASES)) {
    const column = pickColumn(knownColumns, aliases);
    if (!column) continue;
    const value = values[logical];
    if (value === '' || value === undefined) continue;
    payload[column] = value;
  }
  if (!pickColumn(knownColumns, ['user_id']) && !payload.user_id) {
    /* keep going; insert retry will add user_id if the table requires it */
  }
  return payload;
}

async function insertOnce(
  client: SupabaseClient,
  table: string,
  row: Record<string, unknown>
): Promise<SaveResult> {
  const written = await client.from(table).insert(row);
  if (!written.error) return { data: [row], error: null };
  return { data: null, error: { message: written.error.message, code: written.error.code } };
}

async function insertWithIdRetry(
  client: SupabaseClient,
  table: string,
  start: Record<string, unknown>
): Promise<SaveResult> {
  let current = { ...start };
  delete current.id;
  let lastMessage = '';

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await insertOnce(client, table, current);
    if (!result.error) return result;

    lastMessage = result.error.message;
    if (isMissingTable(lastMessage)) return result;
    if (isDuplicateEmail(lastMessage)) return result;

    const notNull = lastMessage.match(/null value in column ["']?([a-z0-9_]+)/i);
    if (notNull?.[1]) {
      const column = notNull[1];
      if (column === 'user_id' || column === 'approval_token') current[column] = crypto.randomUUID();
      else if (column === 'status') current[column] = 'Pending';
      else if (column === 'role') current[column] = 'Travel Agent';
      else if (column === 'is_sample') current[column] = false;
      else if (column === 'id') current[column] = crypto.randomUUID();
      else current[column] = String(current.name || current.email || 'Agent');
      continue;
    }

    const missing = parseMissingColumn(lastMessage);
    if (missing) {
      const before = Object.keys(current).length;
      deleteKeyInsensitive(current, missing);
      if (Object.keys(current).length === 0 || Object.keys(current).length === before) break;
      continue;
    }

    if (/cannot insert a non-DEFAULT value into column ["']?id/i.test(lastMessage)) {
      delete current.id;
      continue;
    }

    if (isDuplicateId(lastMessage) || /invalid input syntax for type uuid/i.test(lastMessage)) {
      if (/user_id/i.test(lastMessage)) current.user_id = crypto.randomUUID();
      else current.id = crypto.randomUUID();
      continue;
    }

    break;
  }

  return { data: null, error: { message: lastMessage || 'Could not save the agent application.' } };
}

export async function insertAgentApplication(
  client: SupabaseClient,
  table: string,
  input: AgentApplicationInput
): Promise<SaveResult> {
  const liveRow = buildLiveAgentInsert(input);
  const first = table === 'registered_agents' ? liveRow : buildAgentPayload(input, await discoverAgentColumns(client, table), {
    userId: String(liveRow.user_id),
  });
  const shapes = [first, liveRow];

  let lastError: SaveResult['error'] = { message: 'Could not save the agent application.' };
  for (const shape of shapes) {
    if (Object.keys(shape).length === 0) continue;
    const result = await insertWithIdRetry(client, table, shape);
    if (!result.error) return result;
    lastError = result.error;
    if (isMissingTable(result.error.message) || isDuplicateEmail(result.error.message)) {
      return result;
    }
  }

  return { data: null, error: lastError };
}

export async function updateAgentFields(
  client: SupabaseClient,
  table: string,
  row: RecordRow,
  patch: Record<string, unknown>
): Promise<SaveResult> {
  const known = await discoverAgentColumns(client, table);
  const columns = known.length > 0 ? known : Object.keys(row);
  const payload: Record<string, unknown> = {};

  const logical: Record<string, unknown> = {
    username: patch.name ?? patch.username,
    email: patch.email,
    phoneNumber: patch.phone ?? patch.phoneNumber,
    country: patch.country,
    companyName: patch.company ?? patch.companyName,
    companyWebsite: patch.company_website ?? patch.companyWebsite,
    gender: patch.gender,
    bio: patch.bio,
    address: patch.address,
    status: patch.status,
    role: patch.role,
    isActive:
      patch.isActive ??
      (typeof patch.status === 'string' ? /active/i.test(patch.status) && !/inactive/i.test(patch.status) : undefined),
  };

  for (const [key, value] of Object.entries(logical)) {
    if (value === undefined) continue;
    const column = pickColumn(columns, FIELD_ALIASES[key] || [key]);
    if (column) payload[column] = value;
  }

  if (Object.keys(payload).length === 0) {
    return { data: null, error: { message: 'No matching agent fields to update.' } };
  }

  const id = row.id;
  let written =
    id != null && id !== ''
      ? await client.from(table).update(payload).eq('id', id)
      : { error: { message: 'No id column', code: undefined } };

  if (written.error && row.email) {
    written = await client.from(table).update(payload).ilike('email', String(row.email));
  }

  if (written.error) {
    return { data: null, error: { message: written.error.message, code: written.error.code } };
  }
  return { data: [{ ...row, ...payload }], error: null };
}
