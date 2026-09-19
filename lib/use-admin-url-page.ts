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

  const page = useMemo(
    () => parseAdminPageParam(searchParams.get('page'), maxPage),
    [searchParams, maxPage]
  );

  const setPage = useCallback(
    (next: number | ((prev: number) => number)) => {
      const resolved = typeof next === 'function' ? next(page) : next;
      let safe = Math.max(1, resolved);
      if (maxPage && maxPage > 0) safe = Math.min(safe, maxPage);
      const params = new URLSearchParams(searchParams.toString());
      if (safe <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(safe));
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [maxPage, page, pathname, router, searchParams]
  );

  const resetPage = useCallback(() => {
    if (!searchParams.get('page')) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return { page, setPage, resetPage };
}
