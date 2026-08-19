import { SITE } from '@/lib/collections';
import { saveWithColumnFallback } from '@/lib/supabase-save';

export type NotifyInput = {
  title: string;
  message: string;
  category: 'subscriber' | 'inquiry' | 'booking' | 'system';
  guestEmail?: string;
};

export async function notifyWorkspace(input: NotifyInput) {
  const { error } = await saveWithColumnFallback('notifications', {
    title: input.title,
    message: input.message,
    category: input.category,
  });
  if (error) {
    console.error('[Notify] Failed to insert notification:', error);
  }

  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await response.json().catch(() => ({}))) as {
      emailed?: boolean;
      reason?: string;
      error?: string;
      id?: string;
    };
    if (!response.ok) {
      console.error('[Notify] Email API failed:', response.status, body);
      return { emailed: false, error: body.error || `HTTP ${response.status}` };
    }
    console.info('[Notify] Alert for', SITE.email, {
      title: input.title,
      category: input.category,
      guestEmail: input.guestEmail || null,
      emailed: Boolean(body.emailed),
      reason: body.reason,
      id: body.id,
    });
    return { emailed: Boolean(body.emailed), reason: body.reason, id: body.id };
  } catch (err) {
    console.error('[Notify] Email API unreachable:', err);
    return { emailed: false, error: err instanceof Error ? err.message : 'unreachable' };
  }
}

export function gmailComposeHref(to: string, subject?: string) {
  const params = new URLSearchParams({ to, su: subject || 'Eton Safaris' });
  return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
}
