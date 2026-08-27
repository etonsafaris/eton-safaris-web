'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startCmsLiveSync } from '@/lib/cms-live';

export default function CmsLiveHost() {
  const router = useRouter();
  useEffect(() => startCmsLiveSync(), []);
  useEffect(() => {
    // Only refresh SSR after a real CMS save broadcast — not on every window focus
    // (focus refresh re-downloaded thousands of tours and timed out pages).
    const refresh = () => router.refresh();
    window.addEventListener('eton-cms-live', refresh);
    return () => window.removeEventListener('eton-cms-live', refresh);
  }, [router]);
  return null;
}
