'use client';

import type { ReactNode } from 'react';
import PublicErrorBoundary from '@/components/public/PublicErrorBoundary';
import PublicNavLoader from '@/components/public/PublicNavLoader';

export type SiteTranslateApi = {
  openMenu: () => void;
  activeLanguageLabel: string;
};

export function useSiteTranslate(): SiteTranslateApi | null {
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
