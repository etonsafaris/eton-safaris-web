import type { SupabaseClient } from '@supabase/supabase-js';
import { createPrivilegedClient } from '@/lib/supabase/admin';
import { AGENT_TABLES, isMissingTable, normalizeAgentEmail } from '@/lib/agent-tables';
import { saveWithColumnFallback, type SaveResult } from '@/lib/supabase-save';
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

function requiredPayload(input: Record<string, unknown>) {
  return {
    name: String(input.name || '').trim(),
    email: String(input.email || '').trim(),
    status: String(input.status || 'Pending').trim() || 'Pending',
  };
}

function extraPayload(input: Record<string, unknown>) {
  const extras: Record<string, unknown> = {};
  const phone = String(input.phone || '').trim();
  const country = String(input.country || '').trim();
  const company = String(input.company || '').trim();
  const website = String(input.company_website || '').trim();
  const gender = String(input.gender || '').trim();
  const bio = String(input.bio || '').trim();
  if (phone) extras.phone = phone;
  if (country) extras.country = country;
  if (company) extras.company = company;
  if (website) extras.company_website = website;
  if (gender) extras.gender = gender;
  if (bio) extras.bio = bio;
  return extras;
}

async function insertAgentRow(
  client: SupabaseClient,
  table: string,
  input: Record<string, unknown>
): Promise<SaveResult> {
  const required = requiredPayload(input);
  const result = await saveWithColumnFallback(table, required, { client });
  if (result.error) return result;

  const extras = extraPayload(input);
  if (Object.keys(extras).length > 0) {
    const saved = result.data?.[0] as RecordRow | undefined;
    const id = saved?.id;
    if (id != null && id !== '') {
      await saveWithColumnFallback(table, extras, { id, client });
    } else if (required.email) {
      await saveWithColumnFallback(table, extras, { eq: { column: 'email', value: required.email }, client });
    }
  }

  const existing = await findAgentByEmail(client, table, required.email);
  return { data: existing ? [existing] : result.data, error: null };
}

export async function saveAgentApplicationOnServer(
  input: Record<string, unknown>
): Promise<SaveResult & { alreadyExists?: boolean; table?: string }> {
  const required = requiredPayload(input);
  if (!required.email.includes('@') || !required.name) {
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
    const existing = await findAgentByEmail(client, table, required.email);
    if (existing) return { data: [existing], error: null, alreadyExists: true, table };
  }

  let lastError: SaveResult['error'] = { message: 'Could not save the agent application.' };
  for (const table of tables) {
    const result = await insertAgentRow(client, table, input);
    if (!result.error) return { ...result, table };
    lastError = result.error;
    if (isMissingTable(result.error.message)) continue;
    if (/already registered|duplicate key/i.test(result.error.message) && /email/i.test(result.error.message)) {
      const existing = await findAgentByEmail(client, table, required.email);
      if (existing) return { data: [existing], error: null, alreadyExists: true, table };
    }
  }

  return { data: null, error: lastError };
}
