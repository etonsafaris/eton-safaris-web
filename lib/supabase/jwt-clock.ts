const JWT_CLOCK_PATTERN =
  /issued at future|iat claim in the future|exp claim|token used before|not yet valid|clock skew|nbf/i;

export function isJwtClockError(message?: string | null) {
  return JWT_CLOCK_PATTERN.test(String(message || ''));
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

/** If a stored user JWT has iat in the future, PostgREST rejects every query. Retry as anon. */
export function createSkewAwareFetch(anonKey: string, onSkew?: () => void) {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await nativeFetch(input, init);
    if (response.ok) return response;
    const text = await readErrorText(response);
    if (!isJwtClockError(text) || !anonKey) return response;
    onSkew?.();
    const headers = new Headers(init?.headers);
    headers.set('apikey', anonKey);
    headers.set('Authorization', `Bearer ${anonKey}`);
    return nativeFetch(input, { ...init, headers });
  };
}
