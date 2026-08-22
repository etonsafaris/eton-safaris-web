import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createPrivilegedClient } from '@/lib/supabase/admin';
import { AGENT_TABLES, isDuplicateEmail, isMissingTable, normalizeAgentEmail } from '@/lib/agent-tables';
import { insertAgentApplication, type AgentApplicationInput } from '@/lib/agent-row';
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

async function createAgentLogin(
  client: SupabaseClient,
  input: AgentApplicationInput
): Promise<User | null> {
  const email = input.email.trim();
  const password = input.password?.trim() || '';
  if (!email.includes('@') || password.length < 6) return null;

  try {
    const created = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: input.name.trim(), role: 'Travel Agent' },
    });
    if (created.data.user) return created.data.user;
  } catch {
    /* admin API needs the service role; fall through */
  }

  const signedUp = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: input.name.trim(), role: 'Travel Agent' } },
  });
  return signedUp.data.user || null;
}

async function saveAgentProfile(client: SupabaseClient, user: User, input: AgentApplicationInput) {
  const row = {
    id: user.id,
    email: input.email.trim(),
    full_name: input.name.trim(),
    role: 'Travel Agent',
    status: 'Pending',
  };
  const upserted = await client.from('profiles').upsert(row, { onConflict: 'id' });
  if (!upserted.error) return;
  await client.from('profiles').insert(row);
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
  };

  if (!parsed.email.includes('@') || !parsed.name) {
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
    const existing = await findAgentByEmail(client, table, parsed.email);
    if (existing) {
      if (parsed.password) {
        const user = await createAgentLogin(client, parsed);
        if (user) await saveAgentProfile(client, user, parsed);
      }
      return { data: [existing], error: null, alreadyExists: true, table };
    }
  }

  let lastError: SaveResult['error'] = { message: 'Could not save the agent application.' };
  for (const table of tables) {
    const result = await insertAgentApplication(client, table, parsed);
    if (!result.error) {
      const saved = (await findAgentByEmail(client, table, parsed.email)) || (result.data?.[0] as RecordRow);
      if (parsed.password) {
        const user = await createAgentLogin(client, parsed);
        if (user) await saveAgentProfile(client, user, parsed);
      }
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
