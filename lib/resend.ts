import { Resend } from 'resend';

export const RESEND_FROM = process.env.RESEND_FROM || 'Eton Safaris <onboarding@resend.dev>';

let client: Resend | null = null;

export function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}
