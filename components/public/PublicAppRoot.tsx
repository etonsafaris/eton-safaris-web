'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import PublicErrorBoundary from '@/components/public/PublicErrorBoundary';
import { HomePageContentProvider } from '@/components/public/useHomePageContent';
import type { HomePageContent } from '@/lib/home-page-content';

function isStaffRoute(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname.startsWith('/agents/portal') ||
    pathname.startsWith('/dashboard')
  );
}

/** Wraps the public site with a client error boundary; staff routes stay unwrapped. */
export default function PublicAppRoot({
  children,
  initialHome = null,
}: {
  children: ReactNode;
  initialHome?: HomePageContent | null;
}) {
  const pathname = usePathname() || '/';
  if (isStaffRoute(pathname)) return <>{children}</>;
  return (
    <HomePageContentProvider initial={initialHome}>
      <PublicErrorBoundary>{children}</PublicErrorBoundary>
    </HomePageContentProvider>
  );
}
