import { MAIN_COLLECTIONS, SYSTEM_COLLECTIONS } from '@/lib/collections';

export type AdminCountItem = { id: string; table: string; aliases?: string[] };

export function buildAdminCountItems(): AdminCountItem[] {
  return [...MAIN_COLLECTIONS, ...SYSTEM_COLLECTIONS]
    .filter((item) => item.table)
    .map((item) => ({
      id: item.id,
      table: item.table,
      aliases: item.aliases || [],
    }));
}
