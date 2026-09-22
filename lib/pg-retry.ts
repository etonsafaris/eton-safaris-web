export function isPgTooManyClientsError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /too many clients already/i.test(message) ||
    /remaining connection slots are reserved/i.test(message) ||
    /Database is busy/i.test(message) ||
    /connection timeout|timeout exceeded|ETIMEDOUT/i.test(message)
  );
}

function retryDelayMs(attempt: number) {
  const base = 400 * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(8000, base + jitter);
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
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Database is busy. Try again.');
}
