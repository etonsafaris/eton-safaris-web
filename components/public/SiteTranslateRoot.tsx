'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import PublicErrorBoundary from '@/components/public/PublicErrorBoundary';

export type SiteTranslateApi = {
  openMenu: () => void;
  activeLanguageLabel: string;
};

export function useSiteTranslate(): SiteTranslateApi | null {
  return null;
}

function isStaffRoute(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname.startsWith('/agents/portal') ||
    pathname.startsWith('/dashboard')
  );
}

export default function SiteTranslateRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  if (isStaffRoute(pathname)) return <>{children}</>;
  return <PublicErrorBoundary>{children}</PublicErrorBoundary>;
}
