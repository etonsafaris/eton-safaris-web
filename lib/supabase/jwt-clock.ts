const JWT_CLOCK_PATTERN = /issued at future|iat claim in the future/i;

export function isJwtClockError(message?: string | null) {
  return JWT_CLOCK_PATTERN.test(String(message || ''));
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return String(input);
}

function isAuthRequest(input: RequestInfo | URL) {
  return /\/auth\/v1\//i.test(requestUrl(input));
}

async function readErrorText(response: Response) {
  try {
    const json = (await response.clone().json()) as Record<string, unknown>;
    return [json.message, json.error_description, json.error, json.msg, json.hint, json.code]
      .filter(Boolean)
      .join(' ');
  } catch {
    try {
      return await response.clone().text();
    } catch {
      return '';
    }
  }
}

/** Retry PostgREST reads as anon when a user JWT iat is ahead of the API clock. Never touch Auth. */
export function createSkewAwareFetch(anonKey: string, onSkew?: () => void) {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await nativeFetch(input, init);
    if (response.ok || isAuthRequest(input) || !anonKey) return response;
    const text = await readErrorText(response);
    if (!isJwtClockError(text)) return response;
    onSkew?.();
    const headers = new Headers(init?.headers);
    headers.set('apikey', anonKey);
    headers.set('Authorization', `Bearer ${anonKey}`);
    return nativeFetch(input, { ...init, headers });
  };
}
