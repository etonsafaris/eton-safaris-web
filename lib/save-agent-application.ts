import type { SupabaseClient } from '@supabase/supabase-js';
import { createPrivilegedClient } from '@/lib/supabase/admin';
import { AGENT_TABLES, isMissingTable, normalizeAgentEmail } from '@/lib/agent-tables';
import { parseMissingColumn, type SaveResult } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

async function tableExists(client: SupabaseClient, table: string) {
  const { error } = await client.from(table).select('id').limit(1);
  return !error || !isMissingTable(error.message);
}

async function findAgentByEmail(client: SupabaseClient, table: string, email: string) {
  const needle = email.trim();
  if (!needle) return null;
  const { data, error } = await client.from(table).select('*').ilike('email', needle).limit(8);
  if (error || !data?.length) return null;
  return (
    (data as RecordRow[]).find((row) => normalizeAgentEmail(row.email ?? row.Email) === normalizeAgentEmail(needle)) ||
    (data[0] as RecordRow) ||
    null
  );
}

function payloadShapes(input: Record<string, unknown>) {
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim();
  const phone = String(input.phone || '').trim();
  const country = String(input.country || '').trim();
  const company = String(input.company || '').trim();
  const website = String(input.company_website || '').trim();
  const gender = String(input.gender || '').trim();
  const bio = String(input.bio || '').trim();

  return [
    { name, email, status: 'Pending' },
    { username: name, email, status: 'Pending' },
    { name, email },
    { username: name, email },
    { username: name, email, isActive: false },
    { full_name: name, email },
    {
      name,
      email,
      ...(phone ? { phone } : {}),
      ...(country ? { country } : {}),
      ...(company ? { company } : {}),
      status: 'Pending',
    },
    {
      username: name,
      email,
      ...(phone ? { phoneNumber: phone } : {}),
      ...(country ? { country } : {}),
      ...(company ? { companyName: company } : {}),
      ...(website ? { companyWebsite: website } : {}),
      isActive: false,
    },
    { email },
    {
      name,
      email,
      ...(phone ? { phone } : {}),
      ...(country ? { country } : {}),
      ...(company ? { company } : {}),
      ...(website ? { company_website: website } : {}),
      ...(gender ? { gender } : {}),
      ...(bio ? { bio } : {}),
      status: 'Pending',
    },
  ];
}

async function insertShape(
  client: SupabaseClient,
  table: string,
  start: Record<string, unknown>
): Promise<SaveResult> {
  let current = { ...start };
  let idMode: 'omit' | 'uuid' | 'int' = 'omit';
  let lastMessage = '';

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const row = { ...current };
    if (idMode === 'omit') delete row.id;
    if (idMode === 'uuid') row.id = crypto.randomUUID();
    if (idMode === 'int') row.id = Math.floor(Date.now() / 1000) + attempt;

    const written = await client.from(table).insert(row);
    if (!written.error) {
      return { data: [row], error: null };
    }

    lastMessage = written.error.message || 'Insert failed';
    if (isMissingTable(lastMessage)) return { data: null, error: { message: lastMessage } };

    if (/duplicate key/i.test(lastMessage) && /email/i.test(lastMessage)) {
      return { data: null, error: { message: lastMessage } };
    }

    const missing = parseMissingColumn(lastMessage);
    if (missing && missing in current) {
      const next = { ...current };
      delete next[missing];
      if (Object.keys(next).length === 0) break;
      current = next;
      continue;
    }

    if (/duplicate key/i.test(lastMessage) && /pkey|_pkey/i.test(lastMessage)) {
      if (idMode === 'omit') idMode = 'uuid';
      else if (idMode === 'uuid') idMode = 'int';
      else break;
      continue;
    }

    if (/invalid input syntax for type uuid/i.test(lastMessage)) {
      idMode = 'uuid';
      continue;
    }

    if (/cannot insert a non-DEFAULT value into column ["']?id/i.test(lastMessage)) {
      idMode = 'omit';
      const next = { ...current };
      delete next.id;
      current = next;
      break;
    }

    break;
  }

  return { data: null, error: { message: lastMessage || 'Could not save the agent application.' } };
}

async function insertAgentRow(
  client: SupabaseClient,
  table: string,
  input: Record<string, unknown>
): Promise<SaveResult> {
  const email = String(input.email || '').trim();
  let lastError: SaveResult['error'] = { message: 'Could not save the agent application.' };

  for (const shape of payloadShapes(input)) {
    const result = await insertShape(client, table, shape);
    if (!result.error) {
      const saved = (await findAgentByEmail(client, table, email)) || (result.data?.[0] as RecordRow);
      return { data: saved ? [saved] : result.data, error: null };
    }
    lastError = result.error;
    if (isMissingTable(result.error.message)) return result;
    if (/duplicate key/i.test(result.error.message) && /email/i.test(result.error.message)) {
      const existing = await findAgentByEmail(client, table, email);
      return {
        data: [existing || { email, name: String(input.name || '').trim(), status: 'Pending' }],
        error: null,
      };
    }
  }

  return { data: null, error: lastError };
}

export async function saveAgentApplicationOnServer(
  input: Record<string, unknown>
): Promise<SaveResult & { alreadyExists?: boolean; table?: string }> {
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim();
  if (!email.includes('@') || !name) {
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
      error: { message: 'The agent register is not available. Ask an administrator to check the agents table.' },
    };
  }

  for (const table of tables) {
    const existing = await findAgentByEmail(client, table, email);
    if (existing) return { data: [existing], error: null, alreadyExists: true, table };
  }

  let lastError: SaveResult['error'] = { message: 'Could not save the agent application.' };
  for (const table of tables) {
    const result = await insertAgentRow(client, table, input);
    if (!result.error) return { ...result, table };
    lastError = result.error;
    if (/already registered|duplicate key/i.test(result.error.message) && /email/i.test(result.error.message)) {
      const existing = await findAgentByEmail(client, table, email);
      if (existing) return { data: [existing], error: null, alreadyExists: true, table };
    }
  }

  return { data: null, error: lastError };
}
