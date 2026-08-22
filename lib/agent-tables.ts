export const AGENT_TABLES = ['registered_agents', 'Agent'] as const;

export function isMissingTable(message: string) {
  return /could not find the table|schema cache|relation .* does not exist/i.test(message);
}

export function isDuplicateId(message: string) {
  return /duplicate key value violates unique constraint/i.test(message) && /pkey|_pkey/i.test(message);
}

export function isDuplicateEmail(message: string) {
  return /duplicate key value violates unique constraint/i.test(message) && /email/i.test(message);
}

export function isDuplicateKey(message: string) {
  return /duplicate key value violates unique constraint/i.test(message);
}

export function normalizeAgentEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export function dedupeAgentRows<T extends Record<string, unknown>>(rows: T[]) {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const row of rows) {
    const email = normalizeAgentEmail(row.email ?? row.Email);
    const id = row.id != null && row.id !== '' ? `id:${String(row.id)}` : '';
    const key = email.includes('@') ? `email:${email}` : id || JSON.stringify(row);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}
