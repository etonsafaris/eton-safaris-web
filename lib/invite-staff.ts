import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { SITE } from '@/lib/collections';
import { saveAgentApplicationOnServer } from '@/lib/save-agent-application';
import { createPrivilegedClient } from '@/lib/supabase/admin';
import { updateAgentFields } from '@/lib/agent-row';
import { findAgentRecord } from '@/lib/find-agent';
import type { RecordRow } from '@/lib/types';

export function staffRoleLabel(role: string) {
  const value = role.trim();
  if (/content manager/i.test(value)) return 'Content Manager';
  if (/tour operator/i.test(value)) return 'Tour Operator';
  if (/admin|full access/i.test(value)) return 'Admin';
  if (/travel agent|^agent$/i.test(value)) return 'Travel Agent';
  if (/limited access|\(user\)|^user$/i.test(value)) return 'User';
  return value || 'User';
}

async function ensureInviteToken(row: RecordRow, table: string) {
  const existing = String(row.approval_token || '').trim();
  if (existing) return existing;
  const token = crypto.randomUUID();
  const client = createPrivilegedClient();
  await updateAgentFields(client, table, row, { approval_token: token });
  return token;
}

export async function inviteStaffUser(input: { email: string; role: string; name?: string; origin?: string }) {
  const email = input.email.trim().toLowerCase();
  const role = input.role.trim() || 'Limited Access (User)';
  const name = (input.name || email.split('@')[0] || 'there').trim();
  const origin = (input.origin || SITE.url).replace(/\/$/, '');
  const roleLabel = staffRoleLabel(role);

  const saved = await saveAgentApplicationOnServer({
    name,
    email,
    role,
    status: 'Pending',
    isActive: false,
  });

  if (saved.error) {
    return { ...saved, emailed: false };
  }

  const client = createPrivilegedClient();
  const found =
    (await findAgentRecord(client, { email })) ||
    (saved.data?.[0] ? { row: saved.data[0] as RecordRow, table: saved.table || 'registered_agents' } : null);
  const token = found ? await ensureInviteToken(found.row, found.table) : '';
  const completeUrl = token ? `${origin}/invite/${token}` : `${origin}/login?mode=signup&email=${encodeURIComponent(email)}`;

  const guestMessage = `Hello ${name}, you have been invited to ${SITE.name} as a ${roleLabel}.

Complete your signup and set your name and password here:
${completeUrl}

Use this email: ${email}

After you finish, you can sign in at ${origin}/login. An administrator will activate dashboard access if it is still pending.`;

  const delivered = await deliverIncomingAlert({
    title: `Complete your ${SITE.name} ${roleLabel} account`,
    message: guestMessage,
    category: 'system',
    guestEmail: email,
    sendToGuest: true,
    guestTitle: `Complete your ${SITE.name} ${roleLabel} account`,
    guestMessage,
    emailAdmin: false,
    recordDashboard: false,
  });

  return {
    ...saved,
    emailed: Boolean(delivered.guestEmailed),
    inviteUrl: completeUrl,
  };
}
