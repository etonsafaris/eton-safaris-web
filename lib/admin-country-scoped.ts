import { NAV_COUNTRIES } from '@/lib/collections';

export const DEFAULT_ADMIN_COUNTRY = NAV_COUNTRIES[0]?.name || 'Uganda';

const COUNTRY_SCOPED_MODULES = new Set(['tours', 'national_park', 'accommodations', 'explore']);

export function moduleUsesCountryScope(collectionId: string) {
  return COUNTRY_SCOPED_MODULES.has(collectionId);
}
