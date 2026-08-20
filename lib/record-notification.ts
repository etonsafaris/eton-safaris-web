import { saveWithColumnFallback } from '@/lib/supabase-save';
import { createPrivilegedClient } from '@/lib/supabase/admin';

export type DashboardNotice = {
  title: string;
  message: string;
  category?: string;
};

export async function recordDashboardNotice(input: DashboardNotice) {
  const client = createPrivilegedClient();
  const payload = {
    title: input.title,
    message: input.message,
    category: input.category || 'system',
    body: input.message,
    content: input.message,
    status: 'Unread',
    read: false,
    seen: false,
    created_at: new Date().toISOString(),
  };
  const result = await saveWithColumnFallback('notifications', payload, { client });
  if (result.error) {
    console.error('[Notifications] Failed to save dashboard notice:', result.error);
    if (/row-level security|permission denied|42501|Could not find the table/i.test(result.error.message)) {
      console.error(
        '[Notifications] Run scripts/fix-inbox-rls.sql in the Supabase SQL editor, and add SUPABASE_SERVICE_ROLE_KEY to .env.local.'
      );
    }
  }
  return result;
}
