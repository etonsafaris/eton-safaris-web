import type { CollectionConfig } from '@/lib/types';

/** Dav-style admin grids: one server page (50 rows), never download whole tables in the browser. */
export function collectionUsesAdminPaging(config: CollectionConfig): boolean {
  if (!config.table) return false;
  return config.view === 'grid' || config.view === 'table';
}
