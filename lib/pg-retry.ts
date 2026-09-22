export function isPgTooManyClientsError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /too many clients already/i.test(message) ||
    /Database is busy/i.test(message) ||
    /connection timeout|timeout exceeded|ETIMEDOUT/i.test(message)
  );
}

export async function withPgRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isPgTooManyClientsError(error) || attempt >= attempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Database is busy. Try again.');
}
