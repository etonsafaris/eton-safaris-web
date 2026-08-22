export const ADMIN_INBOX = 'etonsafaris@gmail.com';

export function isOwnerAdminEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase() === ADMIN_INBOX.toLowerCase();
}
