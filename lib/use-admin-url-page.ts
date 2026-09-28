'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function parseAdminPageParam(raw: string | null | undefined, maxPage = Number.POSITIVE_INFINITY): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  if (Number.isFinite(maxPage) && maxPage > 0) {
    return Math.min(parsed, maxPage);
  }
  return parsed;
}

/** Keeps admin list pagination in `?page=` so refresh and share links preserve the active page. */
export function useAdminUrlPage(maxPage?: number) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? '';

  const page = useMemo(
    () => parseAdminPageParam(new URLSearchParams(queryString).get('page'), maxPage),
    [queryString, maxPage]
  );

  const setPage = useCallback(
    (next: number | ((prev: number) => number)) => {
      const resolved = typeof next === 'function' ? next(page) : next;
      let safe = Math.max(1, resolved);
      if (maxPage && maxPage > 0) safe = Math.min(safe, maxPage);
      const nextParams = new URLSearchParams(queryString);
      if (safe <= 1) {
        nextParams.delete('page');
      } else {
        nextParams.set('page', String(safe));
      }
      const qs = nextParams.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [maxPage, page, pathname, router, queryString]
  );

  const resetPage = useCallback(() => {
    if (!new URLSearchParams(queryString).get('page')) return;
    const nextParams = new URLSearchParams(queryString);
    nextParams.delete('page');
    const qs = nextParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, queryString]);

  return { page, setPage, resetPage };
}
