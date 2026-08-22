import { AGENT_TABLES, isMissingTable, normalizeAgentEmail } from '@/lib/agent-tables';
import type { RecordRow } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function findAgentRecord(
  client: SupabaseClient,
  input: { id?: string; email?: string }
): Promise<{ row: RecordRow; table: string } | null> {
  const email = normalizeAgentEmail(input.email);
  for (const table of AGENT_TABLES) {
    if (input.id) {
      for (const column of ['id', 'uuid', '_id', 'agent_id']) {
        const { data, error } = await client.from(table).select('*').eq(column, input.id).maybeSingle();
        if (!error && data) return { row: data as RecordRow, table };
        if (error && isMissingTable(error.message)) break;
      }
    }

    if (email.includes('@')) {
      const { data, error } = await client.from(table).select('*').ilike('email', email).limit(8);
      if (!error && data?.length) {
        const match =
          ((data as RecordRow[]) || []).find(
            (row) => normalizeAgentEmail(row.email || row.Email) === email
          ) || (data[0] as RecordRow);
        if (match) return { row: match, table };
      }
    }
  }

  return null;
}

export function agentDisplayName(row: RecordRow) {
  return String(row.name || row.username || row.full_name || row.Name || 'Agent');
}

export function agentIsActive(row: RecordRow) {
  const status = String(row.status || '').trim().toLowerCase();
  if (status === 'active') return true;
  if (status === 'inactive' || status === 'pending') return false;
  return Boolean(row.isActive || row.is_active);
}

export function agentJoinedAt(row: RecordRow) {
  return String(row.created_at || row.createdAt || row.created_date || row.joined_at || '');
}

export function isTravelAgentRole(role: unknown) {
  const value = String(role || '').trim();
  if (!value) return true;
  return /travel agent|^agent$/i.test(value) && !/content manager|tour operator|admin|full access/i.test(value);
}

export function isStaffRole(role: unknown) {
  return /content manager|tour operator|admin|full access/i.test(String(role || ''));
}

export function isTravelAgentRow(row: RecordRow) {
  return isTravelAgentRole(row.role);
}

export function isStaffRow(row: RecordRow) {
  return isStaffRole(row.role);
}
