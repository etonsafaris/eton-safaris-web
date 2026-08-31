'use client';

import { usePathname } from 'next/navigation';
import GoogleTranslateProvider from '@/components/public/GoogleTranslateProvider';
import SiteTranslateWidget from '@/components/public/SiteTranslateWidget';

const HIDDEN_PREFIXES = ['/admin', '/login', '/dashboard', '/agents/portal'];

export default function SiteTranslateMount() {
  const pathname = usePathname() || '';
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <>
      <GoogleTranslateProvider />
      <SiteTranslateWidget />
    </>
  );
}
