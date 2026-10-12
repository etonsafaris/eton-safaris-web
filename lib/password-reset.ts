import { createHmac, timingSafeEqual } from 'crypto';

const RESET_TTL_MS = 60 * 60 * 1000;

function resetSecret() {
  return process.env.AUTH_RESET_SECRET || process.env.ADMIN_PASSWORD || process.env.DATABASE_URL || 'eton-safaris-reset';
}

export function createPasswordResetToken(email: string) {
  const payload = Buffer.from(
    JSON.stringify({ email: email.trim().toLowerCase(), exp: Date.now() + RESET_TTL_MS })
  ).toString('base64url');
  const signature = createHmac('sha256', resetSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readPasswordResetToken(token: string) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', resetSecret()).update(payload).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: string; exp?: number };
    const email = String(body.email || '').trim().toLowerCase();
    if (!email.includes('@') || !body.exp || body.exp < Date.now()) return null;
    return { email };
  } catch {
    return null;
  }
}
