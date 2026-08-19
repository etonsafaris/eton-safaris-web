import { SITE } from '@/lib/collections';

export const EMAIL_FROM = process.env.RESEND_FROM || 'Eton Safaris <noreply@etonsafaris.com>';

export function adminInbox() {
  return process.env.ADMIN_EMAIL || SITE.email;
}

export async function sendEmail(input: {
  title: string;
  message: string;
  to?: string[];
  html?: string;
  category?: string;
  replyTo?: string;
}) {
  const adminEmail = adminInbox();
  const resendKey = process.env.RESEND_API_KEY;
  const recipients = (input.to?.filter(Boolean) || [adminEmail]) as string[];
  const unique = Array.from(new Set(recipients));
  const from = EMAIL_FROM;
  const replyTo = input.replyTo || adminEmail;

  if (!resendKey) {
    console.info('[Email] RESEND_API_KEY missing. Logged only — no provider delivery attempted:', {
      title: input.title,
      to: unique,
      from,
      replyTo,
    });
    return { ok: true, emailed: false, reason: 'RESEND_API_KEY not set' as const, from, to: unique };
  }

  const html =
    input.html ||
    `<p>${input.message.replace(/\n/g, '<br/>')}</p><p>Category: ${input.category || 'system'}</p>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: unique,
      reply_to: replyTo,
      subject: input.title,
      html,
    }),
  });

  const payload = await response.text();
  let parsed: { id?: string; message?: string } = {};
  try {
    parsed = payload ? (JSON.parse(payload) as { id?: string; message?: string }) : {};
  } catch {
    parsed = { message: payload };
  }

  if (!response.ok) {
    console.error('[Email] Resend rejected delivery:', response.status, payload);
    return {
      ok: false,
      emailed: false,
      error: parsed.message || payload,
      status: response.status,
      from,
      to: unique,
    };
  }

  console.info('[Email] Resend accepted:', { id: parsed.id, to: unique, from, subject: input.title });
  return { ok: true, emailed: true, id: parsed.id, from, to: unique };
}
