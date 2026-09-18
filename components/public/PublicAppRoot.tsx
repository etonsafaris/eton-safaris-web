'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import PublicErrorBoundary from '@/components/public/PublicErrorBoundary';

function isStaffRoute(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname.startsWith('/agents/portal') ||
    pathname.startsWith('/dashboard')
  );
}

/** Wraps the public site with a client error boundary; staff routes stay unwrapped. */
export default function PublicAppRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  if (isStaffRoute(pathname)) return <>{children}</>;
  return <PublicErrorBoundary>{children}</PublicErrorBoundary>;
}
