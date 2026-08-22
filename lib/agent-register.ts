import { supabase } from '@/lib/supabase/client';
import { AGENT_TABLES, isMissingTable, normalizeAgentEmail } from '@/lib/agent-tables';
import { pickString } from '@/lib/data';
import type { SaveResult } from '@/lib/supabase-save';
import type { RecordRow } from '@/lib/types';

export async function findPublicAgentByEmail(email: string): Promise<RecordRow | null> {
  const needle = email.trim();
  if (!needle) return null;
  for (const table of AGENT_TABLES) {
    const { data, error } = await supabase.from(table).select('*').ilike('email', needle).limit(8);
    if (error) {
      if (isMissingTable(error.message)) continue;
      continue;
    }
    const match = ((data as RecordRow[] | null) || []).find(
      (row) => normalizeAgentEmail(row.email ?? row.Email) === normalizeAgentEmail(needle)
    );
    if (match) return match;
  }
  return null;
}

export async function saveAgentApplication(
  input: Record<string, unknown>
): Promise<SaveResult & { alreadyExists?: boolean }> {
  try {
    const response = await fetch('/api/public/agent-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await response.json().catch(() => ({}))) as {
      data?: Record<string, unknown>[] | null;
      error?: string;
      alreadyExists?: boolean;
    };
    if (!response.ok) {
      return {
        data: null,
        error: { message: body.error || 'Could not save the agent application. Please try again.' },
      };
    }
    return { data: body.data || [], error: null, alreadyExists: body.alreadyExists };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Could not save the agent application.' },
    };
  }
}

export function agentApplicationId(result: SaveResult) {
  const row = result.data?.[0] as RecordRow | undefined;
  return row ? pickString(row, ['id']) || String(row.id || '') : '';
}
