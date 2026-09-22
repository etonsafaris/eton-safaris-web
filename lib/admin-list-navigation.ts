import type { ReadonlyURLSearchParams } from 'next/navigation';

/** Preserve list pagination (and future filters) when leaving for edit/save flows. */
export function adminListQueryString(searchParams?: URLSearchParams | ReadonlyURLSearchParams | null): string {
  if (!searchParams) return '';
  const params = new URLSearchParams();
  const page = searchParams.get('page');
  if (page && page !== '1') {
    params.set('page', page);
  }
  const country = searchParams.get('country');
  const category = searchParams.get('category');
  const park = searchParams.get('park');
  if (country) params.set('country', country);
  if (category) params.set('category', category);
  if (park) params.set('park', park);
  searchParams.forEach((value, key) => {
    if (key === 'page' || key === 'country' || key === 'category' || key === 'park') return;
    if (value) params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function adminCollectionListHref(
  collection: string,
  searchParams?: URLSearchParams | ReadonlyURLSearchParams | null
): string {
  const base = `/admin/${collection}`;
  return `${base}${adminListQueryString(searchParams)}`;
}
