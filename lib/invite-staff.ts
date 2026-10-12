import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { SITE } from '@/lib/collections';
import { saveAgentApplicationOnServer } from '@/lib/save-agent-application';
import { createPrivilegedClient } from '@/lib/supabase/admin';
import { updateAgentFields } from '@/lib/agent-row';
import { findAgentRecord } from '@/lib/find-agent';
import type { RecordRow } from '@/lib/types';

function dashboardSignInOrigin(origin: string) {
  try {
    const host = new URL(origin).host.toLowerCase();
    if (/localhost|127\.0\.0\.1/i.test(host)) return origin.replace(/\/$/, '');
    if (host.startsWith('admin.') || /\.vercel\.app$/i.test(host)) return `https://${host}`;
    if (/(^|\.)etonsafaris\.com$/i.test(host)) return 'https://admin.etonsafaris.com';
  } catch {
    return 'https://admin.etonsafaris.com';
  }
  return 'https://admin.etonsafaris.com';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function staffRoleLabel(role: string) {
  const value = role.trim();
  if (/content manager/i.test(value)) return 'Content Manager';
  if (/tour operator/i.test(value)) return 'Tour Operator';
  if (/travel agent|^agent$/i.test(value)) return 'Travel Agent';
  if (/full access|\badmin\b/i.test(value)) return 'Full Access';
  if (/limited access|\(user\)|^user$/i.test(value)) return 'Limited Access';
  return value || 'Limited Access';
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
  const signInOrigin = dashboardSignInOrigin(origin);
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
  const completeUrl = token
    ? `${signInOrigin}/invite/${encodeURIComponent(token)}`
    : `${signInOrigin}/login?mode=signup&email=${encodeURIComponent(email)}`;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeRole = escapeHtml(roleLabel);
  const safeLink = escapeHtml(completeUrl);

  const guestMessage = `Hello ${name}, you have been invited to ${SITE.name} as a ${roleLabel}.

This invitation was sent to ${email}.

Create your account here:
${completeUrl}

After you finish, sign in at ${signInOrigin}/login. An administrator will activate dashboard access if it is still pending.`;

  const html = `<p>Hello ${safeName}, you have been invited to ${escapeHtml(SITE.name)} as a <strong>${safeRole}</strong>.</p><p>This invitation was sent directly to <strong>${safeEmail}</strong>.</p><p><a href="${safeLink}" style="display:inline-block;background:#00A651;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">Create your account</a></p><p>If the button does not open, copy this address into your browser:<br/><a href="${safeLink}">${safeLink}</a></p><p>After you finish, sign in at <a href="${escapeHtml(signInOrigin)}/login">${escapeHtml(signInOrigin)}/login</a>.</p>`;

  const delivered = await deliverIncomingAlert({
    title: `Complete your ${SITE.name} ${roleLabel} account`,
    message: guestMessage,
    html,
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
    emailError: delivered.guestEmailed ? '' : delivered.emailError || delivered.reason || '',
  };
}
