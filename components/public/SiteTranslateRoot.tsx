'use client';

import type { ReactNode } from 'react';
import PublicErrorBoundary from '@/components/public/PublicErrorBoundary';
import PublicNavLoader from '@/components/public/PublicNavLoader';

export function useSiteTranslate() {
  return null;
}

export default function SiteTranslateRoot({ children }: { children: ReactNode }) {
  return (
    <PublicErrorBoundary>
      <PublicNavLoader />
      {children}
    </PublicErrorBoundary>
  );
}
