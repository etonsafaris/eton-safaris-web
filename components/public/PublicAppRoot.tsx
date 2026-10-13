'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import PublicErrorBoundary from '@/components/public/PublicErrorBoundary';
import PublicShell from '@/components/public/PublicShell';
import { HomePageContentProvider } from '@/components/public/useHomePageContent';
import type { HomePageContent } from '@/lib/home-page-content';

function isStaffRoute(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/payment') ||
    pathname.startsWith('/agents/portal') ||
    pathname.startsWith('/dashboard')
  );
}

/** Wraps the public site with a client error boundary; staff routes stay unwrapped. */
export default function PublicAppRoot({
  children,
  initialHome = null,
  staffHost = false,
}: {
  children: ReactNode;
  initialHome?: HomePageContent | null;
  /** admin.etonsafaris.com rewrites `/` to the panel, so the browser path stays `/`. */
  staffHost?: boolean;
}) {
  const pathname = usePathname() || '/';
  if (staffHost || isStaffRoute(pathname)) return <>{children}</>;
  return (
    <HomePageContentProvider initial={initialHome}>
      <PublicErrorBoundary>
        <PublicShell initialHome={initialHome}>{children}</PublicShell>
      </PublicErrorBoundary>
    </HomePageContentProvider>
  );
}
