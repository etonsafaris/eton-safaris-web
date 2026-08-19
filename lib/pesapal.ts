const SANDBOX = 'https://cybqa.pesapal.com/pesapalv3/api';
const LIVE = 'https://pay.pesapal.com/v3/api';

export function pesapalBaseUrl() {
  return process.env.PESAPAL_ENV === 'live' ? LIVE : SANDBOX;
}

export function pesapalErrorMessage(json: Record<string, unknown>, fallback: string) {
  const error = json.error;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return String(record.message || record.code || record.error_type || JSON.stringify(error));
  }
  return String(json.message || json.error_description || fallback);
}

async function parseJson(response: Response) {
  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    console.error('[Pesapal] Non-JSON body:', text);
    json = { message: text };
  }
  return { json, text, ok: response.ok };
}

export async function pesapalToken() {
  const key = process.env.PESAPAL_CONSUMER_KEY?.replace(/^["']|["']$/g, '');
  const secret = process.env.PESAPAL_CONSUMER_SECRET?.replace(/^["']|["']$/g, '');
  if (!key || !secret) {
    throw new Error('Pesapal keys are not set. Add PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET.');
  }

  const response = await fetch(`${pesapalBaseUrl()}/Auth/RequestToken`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
  });
  const { json, text, ok } = await parseJson(response);
  if (!ok || json.error) {
    console.error('[Pesapal] Token error:', response.status, text);
    throw new Error(pesapalErrorMessage(json, text || 'Pesapal token failed'));
  }
  const token = String(json.token || '');
  if (!token) throw new Error('Pesapal token missing from response');
  return token;
}

export async function pesapalRequest(path: string, init: RequestInit = {}) {
  const token = await pesapalToken();
  const response = await fetch(`${pesapalBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const { json, text, ok } = await parseJson(response);
  if (!ok || json.error) {
    console.error('[Pesapal] Request failed:', path, response.status, text);
    throw new Error(pesapalErrorMessage(json, text || `Pesapal ${path} failed`));
  }
  return json;
}

export async function getPesapalIpnId(preferredUrl: string) {
  if (process.env.PESAPAL_IPN_ID) return process.env.PESAPAL_IPN_ID;

  try {
    const list = await pesapalRequest('/URLSetup/GetIpnList', { method: 'GET' });
    const items = Array.isArray(list)
      ? list
      : Array.isArray((list as { ipns?: unknown[] }).ipns)
        ? (list as { ipns: unknown[] }).ipns
        : [];
    const match = items.find((item) => {
      const row = item as Record<string, unknown>;
      const url = String(row.url || '');
      return url.includes('etonsafaris.com/api/pesapal/ipn');
    }) as Record<string, unknown> | undefined;
    if (match?.ipn_id) return String(match.ipn_id);
  } catch (error) {
    console.error('[Pesapal] GetIpnList failed:', error);
  }

  const publicUrl = process.env.PESAPAL_IPN_URL || preferredUrl;
  const ipn = await pesapalRequest('/URLSetup/RegisterIPN', {
    method: 'POST',
    body: JSON.stringify({ url: publicUrl, ipn_notification_type: 'GET' }),
  });
  return String(ipn.ipn_id || ipn.ipnId || '');
}

export function normalizePhone(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('0')) return `+256${digits.slice(1)}`;
  if (digits.startsWith('256')) return `+${digits}`;
  return digits;
}
