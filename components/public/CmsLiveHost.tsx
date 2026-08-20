'use client';

import { useEffect } from 'react';
import { startCmsLiveSync } from '@/lib/cms-live';

export default function CmsLiveHost() {
  useEffect(() => startCmsLiveSync(), []);
  return null;
}
