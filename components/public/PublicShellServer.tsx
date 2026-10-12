'use client';

import PublicShell from '@/components/public/PublicShell';
import type { HomePageContent } from '@/lib/home-page-content';
import type { PublicDestination } from '@/lib/public-destinations';

/**
 * Pages still wrap content with this. The root layout already paints the
 * header and footer, so a second shell is skipped and no database call
 * runs before the chrome is visible.
 */
export default function PublicShellServer({
  children,
  initialDestinations = [],
  initialHome = null,
}: {
  children: React.ReactNode;
  initialDestinations?: PublicDestination[];
  initialHome?: HomePageContent | null;
}) {
  return (
    <PublicShell initialDestinations={initialDestinations} initialHome={initialHome}>
      {children}
    </PublicShell>
  );
}
