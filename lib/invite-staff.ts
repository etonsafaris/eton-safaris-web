import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { SITE } from '@/lib/collections';
import { saveAgentApplicationOnServer } from '@/lib/save-agent-application';

function temporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function staffRoleLabel(role: string) {
  const value = role.trim();
  if (/content manager/i.test(value)) return 'Content Manager';
  if (/tour operator/i.test(value)) return 'Tour Operator';
  if (/admin|full access/i.test(value)) return 'Admin';
  if (/limited access|\(user\)|^user$/i.test(value)) return 'User';
  return value || 'User';
}

export async function inviteStaffUser(input: { email: string; role: string; name?: string; origin?: string }) {
  const email = input.email.trim().toLowerCase();
  const role = input.role.trim() || 'Limited Access (User)';
  const name = (input.name || email.split('@')[0] || 'there').trim();
  const password = temporaryPassword();
  const origin = (input.origin || SITE.url).replace(/\/$/, '');
  const loginUrl = `${origin}/login`;
  const roleLabel = staffRoleLabel(role);

  const saved = await saveAgentApplicationOnServer({
    name,
    email,
    password,
    role,
    status: 'Pending',
    isActive: false,
  });

  if (saved.error) {
    return { ...saved, emailed: false, password: '' };
  }

  const existingNote = saved.alreadyExists
    ? `This email is already on file. Use Create Account at ${loginUrl} with this same email if you still need to set a password.`
    : `Sign in at ${loginUrl}
Email: ${email}
Temporary password: ${password}`;

  const guestMessage = `Hello ${name}, you have been invited to ${SITE.name} as a ${roleLabel}.

${existingNote}

Your account stays pending until an administrator activates it. You will receive another email when you can open the dashboard.`;

  const delivered = await deliverIncomingAlert({
    title: `You have been invited to ${SITE.name} as a ${roleLabel}`,
    message: guestMessage,
    category: 'system',
    guestEmail: email,
    sendToGuest: true,
    guestTitle: `You have been invited to ${SITE.name} as a ${roleLabel}`,
    guestMessage,
    emailAdmin: false,
    recordDashboard: false,
  });

  return {
    ...saved,
    emailed: Boolean(delivered.guestEmailed),
    password: saved.alreadyExists ? '' : password,
  };
}
