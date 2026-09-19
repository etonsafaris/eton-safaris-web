'use client';

import { useSearchParams } from 'next/navigation';
import { adminCollectionListHref } from '@/lib/admin-list-navigation';

/** List URL for the current admin module, preserving `?page=` from the edit/new route. */
export function useAdminCollectionListHref(collection: string): string {
  const searchParams = useSearchParams();
  return adminCollectionListHref(collection, searchParams);
}
