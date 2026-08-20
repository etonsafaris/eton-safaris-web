'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startCmsLiveSync } from '@/lib/cms-live';

export default function CmsLiveHost() {
  const router = useRouter();
  useEffect(() => startCmsLiveSync(), []);
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('eton-cms-live', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('eton-cms-live', refresh);
    };
  }, [router]);
  return null;
}
