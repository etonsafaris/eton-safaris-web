import { ADMIN_INBOX } from '@/lib/inbox';

export type NotifyInput = {
  title: string;
  message: string;
  category: 'subscriber' | 'inquiry' | 'booking' | 'system' | 'review' | 'agent';
  guestEmail?: string;
  sendToGuest?: boolean;
};

export async function notifyWorkspace(input: NotifyInput) {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await response.json().catch(() => ({}))) as {
      emailed?: boolean;
      recorded?: boolean;
      reason?: string;
      error?: string;
      id?: string;
    };
    if (!response.ok) {
      console.error('[Notify] Email API failed:', response.status, body);
      return { emailed: false, recorded: Boolean(body.recorded), error: body.error || `HTTP ${response.status}` };
    }
    console.info('[Notify] Alert for', ADMIN_INBOX, {
      title: input.title,
      category: input.category,
      guestEmail: input.guestEmail || null,
      sendToGuest: Boolean(input.sendToGuest),
      emailed: Boolean(body.emailed),
      recorded: Boolean(body.recorded),
      reason: body.reason,
      id: body.id,
    });
    return {
      emailed: Boolean(body.emailed),
      recorded: Boolean(body.recorded),
      reason: body.reason,
      id: body.id,
    };
  } catch (err) {
    console.error('[Notify] Email API unreachable:', err);
    return { emailed: false, error: err instanceof Error ? err.message : 'unreachable' };
  }
}

export function gmailComposeHref(to: string, subject?: string) {
  const params = new URLSearchParams({ to, su: subject || 'Eton Safaris' });
  return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
}
