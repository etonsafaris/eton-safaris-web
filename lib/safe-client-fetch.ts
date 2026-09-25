/** Client-side JSON fetch — never throws; returns null on failure. */
export async function fetchJsonSafe<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, { credentials: 'same-origin', ...init });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
