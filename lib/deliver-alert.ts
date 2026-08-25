import { adminInbox, sendEmail } from '@/lib/email';
import { recordDashboardNotice } from '@/lib/record-notification';

export type IncomingAlert = {
  title: string;
  message: string;
  category?: string;
  guestEmail?: string;
  sendToGuest?: boolean;
  guestTitle?: string;
  guestMessage?: string;
  html?: string;
  replyTo?: string;
  /** Dashboard Notifications module. Default true. */
  recordDashboard?: boolean;
  /** Email etonsafaris@gmail.com. Default true. */
  emailAdmin?: boolean;
};

export async function deliverIncomingAlert(input: IncomingAlert) {
  const title = input.title.trim() || 'Eton Safaris notification';
  const message = input.message.trim();
  const category = input.category || 'system';
  const guestEmail = input.guestEmail?.trim();
  const recordDashboard = input.recordDashboard !== false;
  const emailAdmin = input.emailAdmin !== false;

  const recorded = recordDashboard
    ? await recordDashboardNotice({ title, message, category })
    : { data: null, error: null };

  const adminResult = emailAdmin
    ? await sendEmail({
        title,
        message,
        html: input.html,
        category,
        replyTo: input.replyTo || guestEmail || adminInbox(),
        to: [adminInbox()],
      })
    : { ok: true, emailed: false, from: '', to: [] as string[] };

  let guestResult: Awaited<ReturnType<typeof sendEmail>> | undefined;
  if (input.sendToGuest && guestEmail?.includes('@')) {
    guestResult = await sendEmail({
      title: input.guestTitle || title,
      message: input.guestMessage || message,
      html: input.html,
      category,
      replyTo: adminInbox(),
      to: [guestEmail],
      skipAdminCopy: true,
    });
  }

  const emailed = Boolean(adminResult.emailed);
  const noticeId =
    recorded.data?.[0] && typeof recorded.data[0] === 'object' && recorded.data[0] !== null
      ? String((recorded.data[0] as { id?: string | number }).id || '')
      : '';
  return {
    ok: true,
    recorded: !recorded.error,
    emailed,
    guestEmailed: Boolean(guestResult?.emailed),
    recordError: recorded.error?.message,
    emailError: 'error' in adminResult ? adminResult.error : undefined,
    reason: 'reason' in adminResult ? adminResult.reason : recorded.error?.message,
    id: noticeId || ('id' in adminResult ? adminResult.id : undefined),
    from: 'from' in adminResult ? adminResult.from : undefined,
    to: 'to' in adminResult ? adminResult.to : [adminInbox()],
  };
}
