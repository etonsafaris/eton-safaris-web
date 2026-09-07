'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import PublicPageLoader from '@/components/public/PublicPageLoader';

function isPublicPath(pathname: string) {
  return !pathname.startsWith('/admin') && !pathname.startsWith('/login') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/agents/portal');
}

export default function PublicNavLoader() {
  const pathname = usePathname() || '/';
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    if (!isPublicPath(pathname)) return undefined;

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      let next: URL;
      try {
        next = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (next.origin !== window.location.origin) return;
      if (!isPublicPath(next.pathname)) return;
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;
      setPending(true);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  useEffect(() => {
    if (!pending) return undefined;
    const timer = window.setTimeout(() => setPending(false), 12000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  if (!pending || !isPublicPath(pathname)) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white" role="status" aria-live="polite">
      <PublicPageLoader label="Loading page" className="min-h-0" />
    </div>
  );
}
