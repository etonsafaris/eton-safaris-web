type SupabaseClient = any;
import { createPrivilegedClient } from '@/lib/supabase/admin';
import { AGENT_TABLES, isDuplicateEmail, isMissingTable, normalizeAgentEmail } from '@/lib/agent-tables';
import { insertAgentApplication, type AgentApplicationInput } from '@/lib/agent-row';
import { ensureConfirmedAuthUser } from '@/lib/ensure-auth-user';
import type { SaveResult } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

async function tableExists(client: SupabaseClient, table: string) {
  const { error } = await client.from(table).select('*').limit(1);
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

export async function saveAgentApplicationOnServer(
  input: Record<string, unknown>
): Promise<SaveResult & { alreadyExists?: boolean; table?: string }> {
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
    password: String(input.password || '').trim(),
    user_id: String(input.user_id || '').trim(),
    role: String(input.role || 'Travel Agent').trim() || 'Travel Agent',
  };

  if (!parsed.email.includes('@') || !parsed.name) {
    return { data: null, error: { message: 'Name and email are required.' } };
  }

  const client = createPrivilegedClient();
  const tables: string[] = [];
  for (const table of AGENT_TABLES) {
    if (await tableExists(client, table)) tables.push(table);
  }
  if (tables.length === 0) tables.push('registered_agents');

  for (const table of tables) {
    const existing = await findAgentByEmail(client, table, parsed.email);
    if (existing) {
      return { data: [existing], error: null, alreadyExists: true, table };
    }
  }

  const authUser = await ensureConfirmedAuthUser(client, {
    email: parsed.email,
    password: parsed.password,
    name: parsed.name,
    role: parsed.role,
    userId: parsed.user_id,
  });
  if (authUser?.id) parsed.user_id = authUser.id;
  if (!parsed.user_id) parsed.user_id = crypto.randomUUID();

  let lastError: SaveResult['error'] = { message: 'Could not save the agent application.' };
  for (const table of tables) {
    const result = await insertAgentApplication(client, table, parsed);
    if (!result.error) {
      const saved = (await findAgentByEmail(client, table, parsed.email)) || (result.data?.[0] as RecordRow);
      return { data: saved ? [saved] : result.data, error: null, table };
    }
    lastError = result.error;
    if (isDuplicateEmail(result.error.message)) {
      const existing = await findAgentByEmail(client, table, parsed.email);
      return {
        data: [existing || { email: parsed.email, name: parsed.name, status: 'Pending' }],
        error: null,
        alreadyExists: true,
        table,
      };
    }
  }

  return { data: null, error: lastError };
}
