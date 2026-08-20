import { ADMIN_INBOX } from '@/lib/inbox';
import { getResend, RESEND_FROM } from '@/lib/resend';

export { ADMIN_INBOX };
export const EMAIL_FROM = RESEND_FROM;

export function adminInbox() {
  return ADMIN_INBOX;
}

export function withAdminInbox(to?: Array<string | undefined | null>, options?: { skipAdminCopy?: boolean }) {
  const recipients = (to || []).filter((value): value is string => Boolean(value && value.includes('@')));
  if (!options?.skipAdminCopy) recipients.push(ADMIN_INBOX);
  if (!recipients.length) recipients.push(ADMIN_INBOX);
  return Array.from(new Set(recipients.map((value) => value.trim().toLowerCase())));
}

type SendResult = {
  ok: boolean;
  emailed: boolean;
  reason?: 'RESEND_API_KEY not set';
  error?: string;
  id?: string;
  from: string;
  to: string[];
};

async function sendOne(input: {
  title: string;
  message: string;
  to: string[];
  html?: string;
  category?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const from = EMAIL_FROM;
  const replyTo = input.replyTo || adminInbox();
  const html =
    input.html ||
    `<p>${input.message.replace(/\n/g, '<br/>')}</p><p>Category: ${input.category || 'system'}</p>`;
  const resend = getResend();
  if (!resend) {
    console.info('[Email] RESEND_API_KEY missing. Logged only — no provider delivery attempted:', {
      title: input.title,
      to: input.to,
      from,
      replyTo,
    });
    return { ok: true, emailed: false, reason: 'RESEND_API_KEY not set', from, to: input.to };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    replyTo,
    subject: input.title,
    html,
  });

  if (error) {
    const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error);
    console.error('[Email] Resend rejected delivery:', error);
    return { ok: false, emailed: false, error: message, from, to: input.to };
  }

  console.info('[Email] Resend accepted:', { id: data?.id, to: input.to, from, subject: input.title });
  return { ok: true, emailed: true, id: data?.id, from, to: input.to };
}

export async function sendEmail(input: {
  title: string;
  message: string;
  to?: string[];
  html?: string;
  category?: string;
  replyTo?: string;
  skipAdminCopy?: boolean;
}): Promise<SendResult> {
  const adminEmail = adminInbox().toLowerCase();
  const requested = (input.to || []).filter((value): value is string => Boolean(value && value.includes('@')));
  const others = requested.filter((value) => value.trim().toLowerCase() !== adminEmail);
  const recipients: string[] = [];
  if (!input.skipAdminCopy) recipients.push(adminInbox());
  recipients.push(...others);
  if (!recipients.length && input.skipAdminCopy) recipients.push(...requested);
  if (!recipients.length) recipients.push(adminInbox());

  const unique = Array.from(new Set(recipients.map((value) => value.trim().toLowerCase())));
  let emailed = false;
  let lastError: string | undefined;
  let lastReason: SendResult['reason'];
  let id: string | undefined;
  const from = EMAIL_FROM;

  for (const address of unique) {
    const result = await sendOne({
      title: input.title,
      message: input.message,
      html: input.html,
      category: input.category,
      replyTo: input.replyTo,
      to: [address],
    });
    if (result.emailed) {
      emailed = true;
      id = result.id || id;
    } else if (result.reason) {
      lastReason = result.reason;
    } else if (result.error) {
      lastError = result.error;
    }
  }

  return {
    ok: emailed || !lastError,
    emailed,
    reason: lastReason,
    error: emailed ? undefined : lastError,
    id,
    from,
    to: unique,
  };
}
