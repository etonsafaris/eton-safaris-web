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
};

/** Always writes the Notifications module and emails etonsafaris@gmail.com. Guest email is extra and cannot block the admin copy. */
export async function deliverIncomingAlert(input: IncomingAlert) {
  const title = input.title.trim() || 'Eton Safaris notification';
  const message = input.message.trim();
  const category = input.category || 'system';
  const guestEmail = input.guestEmail?.trim();

  const recorded = await recordDashboardNotice({ title, message, category });

  const adminResult = await sendEmail({
    title,
    message,
    html: input.html,
    category,
    replyTo: input.replyTo || guestEmail || adminInbox(),
    to: [adminInbox()],
  });

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
  return {
    ok: true,
    recorded: !recorded.error,
    emailed,
    guestEmailed: Boolean(guestResult?.emailed),
    recordError: recorded.error?.message,
    emailError: 'error' in adminResult ? adminResult.error : undefined,
    reason: 'reason' in adminResult ? adminResult.reason : recorded.error?.message,
    id: 'id' in adminResult ? adminResult.id : undefined,
    from: 'from' in adminResult ? adminResult.from : undefined,
    to: 'to' in adminResult ? adminResult.to : [adminInbox()],
  };
}
